import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

const SESSION_TOKEN_KEY = "ktracker_session_token";
const PENDING_INVITES_KEY = "ktracker_pending_invites";

export interface EmailUser {
  email: string;
  displayName: string;
}

interface EmailAuthContextValue {
  emailUser: EmailUser | null;
  sessionToken: string | null;
  isInitializing: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName: string,
    inviteToken?: string,
  ) => Promise<void>;
  logoutEmail: () => Promise<void>;
  generateInvite: () => Promise<string>;
}

const EmailAuthContext = createContext<EmailAuthContextValue | null>(null);

// Simple deterministic hash — same algo as before, client-side only
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `h${Math.abs(hash).toString(16)}`;
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string): void {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // ignore
  }
}

// Pending invites: tokens stored locally for resilience
function getStoredInvites(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_INVITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function addPendingInvite(token: string): void {
  try {
    const existing = getStoredInvites();
    localStorage.setItem(
      PENDING_INVITES_KEY,
      JSON.stringify([...existing, token]),
    );
  } catch {
    // ignore
  }
}

function removePendingInvite(token: string): void {
  try {
    const existing = getStoredInvites().filter((t) => t !== token);
    localStorage.setItem(PENDING_INVITES_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export function EmailAuthProvider({ children }: { children: React.ReactNode }) {
  const [emailUser, setEmailUser] = useState<EmailUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Lazy anonymous actor — created once and reused
  const actorRef = useRef<backendInterface | null>(null);

  const getActor = useCallback(async (): Promise<backendInterface> => {
    if (actorRef.current) return actorRef.current;
    const actor = await createActorWithConfig();
    actorRef.current = actor;
    return actor;
  }, []);

  const logErrorSafe = useCallback(
    async (context: string, err: unknown): Promise<void> => {
      try {
        const msg = err instanceof Error ? err.message : String(err);
        const actor = await getActor();
        await actor.logError(context, msg);
      } catch {
        // ignore — don't crash on log errors
      }
    },
    [getActor],
  );

  // On mount: restore session from localStorage
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsInitializing(false);
      return;
    }

    getActor()
      .then((actor) => actor.validateSession(token))
      .then((profile) => {
        setEmailUser({
          email: profile.email,
          displayName: profile.displayName,
        });
        setSessionToken(token);
        // Store current user info for activityLog
        try {
          sessionStorage.setItem(
            "ktracker_current_user",
            JSON.stringify({
              email: profile.email,
              displayName: profile.displayName,
            }),
          );
        } catch {
          // ignore
        }
      })
      .catch(async (err) => {
        // Session invalid/expired — clear it
        clearToken();
        try {
          sessionStorage.removeItem("ktracker_current_user");
        } catch {
          // ignore
        }
        await logErrorSafe("session_restore", err);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [getActor, logErrorSafe]);

  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      if (!email.trim()) throw new Error("Email is required");
      if (!password) throw new Error("Password is required");

      const hash = simpleHash(password);
      try {
        const actor = await getActor();
        const token = await actor.loginUser(email.trim().toLowerCase(), hash);
        const profile = await actor.validateSession(token);
        saveToken(token);
        setSessionToken(token);
        const user: EmailUser = {
          email: profile.email,
          displayName: profile.displayName,
        };
        setEmailUser(user);
        try {
          sessionStorage.setItem("ktracker_current_user", JSON.stringify(user));
        } catch {
          // ignore
        }
      } catch (err) {
        await logErrorSafe("login", err);
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("not found") ||
          msg.toLowerCase().includes("password")
        ) {
          throw new Error("Invalid email or password");
        }
        throw new Error(msg || "Login failed");
      }
    },
    [getActor, logErrorSafe],
  );

  const registerWithEmail = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      inviteToken?: string,
    ): Promise<void> => {
      if (!email.trim()) throw new Error("Email is required");
      if (password.length < 6)
        throw new Error("Password must be at least 6 characters");
      if (!displayName.trim()) throw new Error("Display name is required");

      const hash = simpleHash(password);
      const normalizedEmail = email.trim().toLowerCase();

      let token: string;

      try {
        const actor = await getActor();

        if (inviteToken?.trim()) {
          const trimmedInvite = inviteToken.trim();
          // Try backend invite first
          try {
            token = await actor.registerWithInvite(
              trimmedInvite,
              normalizedEmail,
              hash,
              displayName.trim(),
            );
            // Remove from pending invites if it was stored locally
            removePendingInvite(trimmedInvite);
          } catch (backendErr) {
            // If backend invite fails, check local pending invites
            const localInvites = getStoredInvites();
            if (localInvites.includes(trimmedInvite)) {
              // Local invite is valid — try registering as first user
              try {
                token = await actor.registerFirstUser(
                  normalizedEmail,
                  hash,
                  displayName.trim(),
                );
                removePendingInvite(trimmedInvite);
              } catch {
                await logErrorSafe("register_with_invite", backendErr);
                throw backendErr;
              }
            } else {
              await logErrorSafe("register_with_invite", backendErr);
              const msg =
                backendErr instanceof Error
                  ? backendErr.message
                  : String(backendErr);
              if (
                msg.toLowerCase().includes("invalid") ||
                msg.toLowerCase().includes("expired")
              ) {
                throw new Error("Invalid or expired invite token");
              }
              throw new Error(msg || "Registration failed");
            }
          }
        } else {
          // No invite — try as first user
          try {
            token = await actor.registerFirstUser(
              normalizedEmail,
              hash,
              displayName.trim(),
            );
          } catch (firstUserErr) {
            await logErrorSafe("register_first_user", firstUserErr);
            const msg =
              firstUserErr instanceof Error
                ? firstUserErr.message
                : String(firstUserErr);
            if (
              msg.toLowerCase().includes("already") ||
              msg.toLowerCase().includes("users exist")
            ) {
              throw new Error(
                "An invite token is required to register. Ask an existing user to generate one.",
              );
            }
            if (msg.toLowerCase().includes("email")) {
              throw new Error("An account with this email already exists");
            }
            throw new Error(msg || "Registration failed");
          }
        }

        const actor2 = await getActor();
        const profile = await actor2.validateSession(token);
        saveToken(token);
        setSessionToken(token);
        const user: EmailUser = {
          email: profile.email,
          displayName: profile.displayName,
        };
        setEmailUser(user);
        try {
          sessionStorage.setItem("ktracker_current_user", JSON.stringify(user));
        } catch {
          // ignore
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("invite") ||
            err.message.includes("already exists") ||
            err.message.includes("required") ||
            err.message.includes("Registration failed") ||
            err.message.includes("6 characters"))
        ) {
          throw err;
        }
        await logErrorSafe("register", err);
        throw err;
      }
    },
    [getActor, logErrorSafe],
  );

  const logoutEmail = useCallback(async (): Promise<void> => {
    const token = sessionToken || getStoredToken();
    if (token) {
      try {
        const actor = await getActor();
        await actor.logoutUser(token);
      } catch (err) {
        await logErrorSafe("logout", err);
        // Continue logout even if backend call fails
      }
    }
    clearToken();
    setSessionToken(null);
    setEmailUser(null);
    try {
      sessionStorage.removeItem("ktracker_current_user");
    } catch {
      // ignore
    }
  }, [sessionToken, getActor, logErrorSafe]);

  const generateInvite = useCallback(async (): Promise<string> => {
    const token = sessionToken || getStoredToken();

    // Try backend first
    if (token) {
      try {
        const actor = await getActor();
        const inviteToken = await actor.generateInviteToken(token);
        return inviteToken;
      } catch {
        // Backend rejected (likely ICP auth check) — fall through to local generation
      }
    }

    // Frontend-only fallback: generate random token and store locally
    const randomToken = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
    addPendingInvite(randomToken);
    return randomToken;
  }, [sessionToken, getActor]);

  return (
    <EmailAuthContext.Provider
      value={{
        emailUser,
        sessionToken,
        isInitializing,
        loginWithEmail,
        registerWithEmail,
        logoutEmail,
        generateInvite,
      }}
    >
      {children}
    </EmailAuthContext.Provider>
  );
}

export function useEmailAuth(): EmailAuthContextValue {
  const ctx = useContext(EmailAuthContext);
  if (!ctx) {
    throw new Error("useEmailAuth must be used within EmailAuthProvider");
  }
  return ctx;
}
