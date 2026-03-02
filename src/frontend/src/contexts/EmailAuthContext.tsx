import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const USERS_KEY = "ktracker_users";
const CURRENT_USER_KEY = "ktracker_current_user";

interface StoredUser {
  email: string;
  passwordHash: string;
  displayName: string;
}

export interface EmailUser {
  email: string;
  displayName: string;
}

interface EmailAuthContextValue {
  emailUser: EmailUser | null;
  isInitializing: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logoutEmail: () => void;
}

const EmailAuthContext = createContext<EmailAuthContextValue | null>(null);

function simpleHash(str: string): string {
  // Simple deterministic hash (not cryptographically secure, but fine for demo)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `h${Math.abs(hash).toString(16)}`;
}

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function EmailAuthProvider({ children }: { children: React.ReactNode }) {
  const [emailUser, setEmailUser] = useState<EmailUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CURRENT_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EmailUser;
        setEmailUser(parsed);
      }
    } catch {
      // ignore
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      const users = getStoredUsers();
      const hash = simpleHash(password);
      const user = users.find(
        (u) =>
          u.email.toLowerCase() === email.toLowerCase() &&
          u.passwordHash === hash,
      );
      if (!user) {
        throw new Error("Invalid email or password");
      }
      const currentUser: EmailUser = {
        email: user.email,
        displayName: user.displayName,
      };
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      setEmailUser(currentUser);
    },
    [],
  );

  const registerWithEmail = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
    ): Promise<void> => {
      const users = getStoredUsers();
      const existing = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      if (existing) {
        throw new Error("An account with this email already exists");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const hash = simpleHash(password);
      const newUser: StoredUser = {
        email: email.toLowerCase(),
        passwordHash: hash,
        displayName,
      };
      saveStoredUsers([...users, newUser]);
      const currentUser: EmailUser = {
        email: newUser.email,
        displayName: newUser.displayName,
      };
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      setEmailUser(currentUser);
    },
    [],
  );

  const logoutEmail = useCallback(() => {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    setEmailUser(null);
  }, []);

  return (
    <EmailAuthContext.Provider
      value={{
        emailUser,
        isInitializing,
        loginWithEmail,
        registerWithEmail,
        logoutEmail,
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
