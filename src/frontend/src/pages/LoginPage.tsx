import { Button } from "@/components/ui/button";
import {
  Activity,
  BarChart3,
  Globe,
  MousePointerClick,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  const stats = [
    { label: "Clicks tracked", value: "2.4B+", icon: MousePointerClick },
    { label: "Campaigns live", value: "48K+", icon: Activity },
    { label: "Revenue tracked", value: "$12M+", icon: TrendingUp },
    { label: "Countries", value: "195", icon: Globe },
  ];

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
          className="space-y-8"
        >
          <div>
            <h2 className="font-display text-3xl font-bold mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to access your tracking dashboard
            </p>
          </div>

          <div className="space-y-4">
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
                  "Sign In"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                New users will be prompted to create a profile
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              KTracker uses Internet Computer Protocol for secure, on-chain
              authentication and data storage.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
