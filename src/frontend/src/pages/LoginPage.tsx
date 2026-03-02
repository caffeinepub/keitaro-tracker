import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  BarChart3,
  Globe,
  Loader2,
  Mail,
  MousePointerClick,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useEmailAuth } from "../contexts/EmailAuthContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface LoginPageProps {
  /** Called after successful login — use this to close a modal, etc. */
  onLoginSuccess?: () => void;
  /** When true, render a compact form-only layout (for modal usage) */
  compact?: boolean;
}

export default function LoginPage({
  onLoginSuccess,
  compact = false,
}: LoginPageProps) {
  const { login, isLoggingIn, loginStatus } = useInternetIdentity();
  const { loginWithEmail, registerWithEmail, emailUser } = useEmailAuth();

  // Email/password state
  const [emailMode, setEmailMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  // Auto-close modal on successful email login
  useEffect(() => {
    if (emailUser && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [emailUser, onLoginSuccess]);

  // Auto-close modal on successful Internet Identity login
  useEffect(() => {
    if (loginStatus === "success" && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [loginStatus, onLoginSuccess]);

  const stats = [
    { label: "Clicks tracked", value: "2.4B+", icon: MousePointerClick },
    { label: "Campaigns live", value: "48K+", icon: Activity },
    { label: "Revenue tracked", value: "$12M+", icon: TrendingUp },
    { label: "Countries", value: "195", icon: Globe },
  ];

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }

    setIsEmailSubmitting(true);
    try {
      if (emailMode === "register") {
        if (!displayName.trim()) {
          toast.error("Display name is required");
          setIsEmailSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setIsEmailSubmitting(false);
          return;
        }
        await registerWithEmail(email.trim(), password, displayName.trim());
        toast.success("Account created successfully!");
      } else {
        await loginWithEmail(email.trim(), password);
        toast.success("Signed in successfully!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const loginForm = (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="w-full mb-4">
        <TabsTrigger value="email" className="flex-1 gap-2">
          <Mail className="w-3.5 h-3.5" />
          Email / Password
        </TabsTrigger>
        <TabsTrigger value="ii" className="flex-1 gap-2">
          <BarChart3 className="w-3.5 h-3.5" />
          Internet Identity
        </TabsTrigger>
      </TabsList>

      {/* Email / Password Tab */}
      <TabsContent value="email">
        <div className="bg-card rounded-lg border border-border p-6">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {emailMode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  emailMode === "register"
                    ? "Min. 6 characters"
                    : "Your password"
                }
                autoComplete={
                  emailMode === "register" ? "new-password" : "current-password"
                }
              />
            </div>
            {emailMode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isEmailSubmitting}
              className="w-full"
              size="lg"
            >
              {isEmailSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {emailMode === "register"
                    ? "Creating account..."
                    : "Signing in..."}
                </span>
              ) : emailMode === "register" ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            {emailMode === "login" ? (
              <p className="text-xs text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("register");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Register
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("login");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Internet Identity Tab */}
      <TabsContent value="ii">
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <BarChart3 className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm font-medium">Internet Identity</div>
              <div className="text-xs text-muted-foreground">
                Secure, decentralized auth
              </div>
            </div>
          </div>

          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            size="lg"
          >
            {isLoggingIn ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              "Sign In with Internet Identity"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            New users will be prompted to create a profile
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );

  // Compact mode: just the form, no full-screen layout (for modal)
  if (compact) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold mb-1">Sign In</h2>
          <p className="text-sm text-muted-foreground">
            Optional — use the app without signing in, or sign in to track
            activity.
          </p>
        </div>
        {loginForm}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-12 border-r border-border">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              KTracker
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Track every
              <span className="text-primary block">click & conversion</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Professional ad tracking platform. Monitor campaigns, optimize
              flows, and maximize your ROI with precision analytics.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-2 gap-4"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-card rounded-lg p-4 border border-border"
            >
              <stat.icon className="w-4 h-4 text-primary mb-2" />
              <div className="font-display text-2xl font-bold">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="w-full max-w-md flex flex-col justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div>
            <h2 className="font-display text-3xl font-bold mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to access your tracking dashboard
            </p>
          </div>

          {loginForm}

          <div className="text-xs text-muted-foreground">
            <p>
              KTracker uses Internet Computer Protocol for secure, on-chain data
              storage.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
