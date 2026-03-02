import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  GitBranch,
  Globe,
  LayoutDashboard,
  Link2,
  Loader2,
  LogIn,
  LogOut,
  MousePointerClick,
  Network,
  RefreshCw,
  Repeat2,
  Settings,
  Tag,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import type { EmailUser } from "../contexts/EmailAuthContext";
import { useEmailAuth } from "../contexts/EmailAuthContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import ActivityLogPage from "../pages/ActivityLogPage";
import CampaignsPage from "../pages/CampaignsPage";
import ClickHandlerPage from "../pages/ClickHandlerPage";
import ClicksLogPage from "../pages/ClicksLogPage";
import ConversionsLogPage from "../pages/ConversionsLogPage";
import DashboardPage from "../pages/DashboardPage";
import DomainsPage from "../pages/DomainsPage";
import ErrorLogPage from "../pages/ErrorLogPage";
import FlowsPage from "../pages/FlowsPage";
import LoginPage from "../pages/LoginPage";
import OffersPage from "../pages/OffersPage";
import ReportsPage from "../pages/ReportsPage";
import TrafficSourcesPage from "../pages/TrafficSourcesPage";

type Page =
  | "dashboard"
  | "campaigns"
  | "offers"
  | "traffic-sources"
  | "flows"
  | "domains"
  | "activity-log"
  | "error-log"
  | "clicks"
  | "conversions"
  | "reports";

interface LayoutProps {
  userProfile: UserProfile | null | undefined;
  emailUser: EmailUser | null;
  onLogout: () => void;
}

const navItems = [
  { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
  { id: "campaigns" as Page, label: "Campaigns", icon: Activity },
  { id: "offers" as Page, label: "Offers", icon: Tag },
  { id: "traffic-sources" as Page, label: "Traffic Sources", icon: Network },
  { id: "flows" as Page, label: "Flows", icon: GitBranch },
  { id: "domains" as Page, label: "Domains", icon: Globe },
  { id: "activity-log" as Page, label: "Activity Log", icon: ClipboardList },
  {
    id: "__sep__" as const,
    label: "" as const,
    icon: null as unknown as React.ComponentType<{ className?: string }>,
  },
  { id: "clicks" as Page, label: "Clicks Log", icon: MousePointerClick },
  { id: "conversions" as Page, label: "Conversions", icon: Repeat2 },
  { id: "reports" as Page, label: "Reports", icon: BarChart3 },
  { id: "error-log" as Page, label: "Error Log", icon: AlertTriangle },
];

// Parse hash for click route: #/click/:campaignKey
function getClickCampaignKey(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#\/click\/(.+)$/);
  return match ? match[1] : null;
}

export default function Layout({
  userProfile,
  emailUser,
  onLogout,
}: LayoutProps) {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [clickCampaignKey, setClickCampaignKey] = useState<string | null>(
    getClickCampaignKey,
  );

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const { identity, clear } = useInternetIdentity();
  const { logoutEmail, generateInvite } = useEmailAuth();
  const queryClient = useQueryClient();

  // Listen for hash changes (in case of back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      setClickCampaignKey(getClickCampaignKey());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const isAuthenticated = !!identity || !!emailUser;

  const handleLogout = async () => {
    if (emailUser) {
      await logoutEmail();
    } else {
      clear();
    }
    queryClient.clear();
    onLogout();
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const token = await generateInvite();
      const url = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(token)}`;
      setInviteUrl(url);
      setShowInviteDialog(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate invite",
      );
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Failed to copy — please copy manually");
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "campaigns":
        return <CampaignsPage />;
      case "offers":
        return <OffersPage />;
      case "traffic-sources":
        return <TrafficSourcesPage />;
      case "flows":
        return <FlowsPage />;
      case "domains":
        return <DomainsPage />;
      case "activity-log":
        return <ActivityLogPage />;
      case "error-log":
        return <ErrorLogPage />;
      case "clicks":
        return <ClicksLogPage />;
      case "conversions":
        return <ConversionsLogPage />;
      case "reports":
        return <ReportsPage />;
      default:
        return <DashboardPage />;
    }
  };

  // Determine display name: email user takes priority
  const displayName = emailUser?.displayName || userProfile?.name || "Guest";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const authLabel = emailUser
    ? emailUser.email
    : userProfile?.name || "Internet Identity";

  const currentNavItem = navItems.find(
    (item) => item.id !== "__sep__" && item.id === currentPage,
  ) as
    | {
        id: Page;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
      }
    | undefined;

  // If hash matches #/click/:campaignKey, render click handler directly
  if (clickCampaignKey) {
    return <ClickHandlerPage campaignKey={clickCampaignKey} />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-14 px-4 border-b border-sidebar-border",
            collapsed ? "justify-center" : "gap-2",
          )}
        >
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-bold tracking-tight text-sidebar-foreground">
              KTracker
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            if (item.id === "__sep__") {
              return (
                <Separator
                  key="nav-separator"
                  className="my-2 bg-sidebar-border"
                />
              );
            }
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                type="button"
                key={item.id}
                data-ocid={`nav.${item.id}.link`}
                onClick={() => setCurrentPage(item.id as Page)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  item.id === "error-log"
                    ? "text-destructive/60 hover:text-destructive"
                    : "",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    isActive ? "text-primary" : "",
                    item.id === "error-log" && isActive
                      ? "text-destructive"
                      : "",
                    "w-4 h-4",
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="px-2 pb-2">
          <button
            type="button"
            data-ocid="nav.collapse.toggle"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors",
              collapsed && "justify-center px-2",
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-base font-semibold">
              {currentNavItem?.label ?? "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="header.secondary_button"
              onClick={() => queryClient.invalidateQueries()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {isAuthenticated ? (
              /* Logged-in user dropdown */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    data-ocid="header.dropdown_menu"
                    className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent transition-colors"
                  >
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                      <span className="text-sm font-medium hidden sm:block">
                        {displayName}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Signed in as
                  </div>
                  <div className="px-2 py-1 text-sm font-medium truncate">
                    {authLabel}
                  </div>
                  <Separator className="my-1" />
                  {/* Only show invite option for email-authenticated users */}
                  {emailUser && (
                    <DropdownMenuItem
                      data-ocid="header.invite.button"
                      onClick={handleGenerateInvite}
                      disabled={isGeneratingInvite}
                      className="gap-2"
                    >
                      {isGeneratingInvite ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      Generate Invite Link
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    data-ocid="header.reports.button"
                    onClick={() => setCurrentPage("reports")}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Reports
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-ocid="header.logout.button"
                    onClick={handleLogout}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Guest login button */
              <Button
                variant="outline"
                size="sm"
                data-ocid="header.login.button"
                onClick={() => setShowLoginModal(true)}
                className="gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{renderPage()}</main>

        {/* Footer */}
        <footer className="border-t border-border px-6 py-2.5 text-xs text-muted-foreground flex items-center justify-between shrink-0">
          <span>KTracker © {new Date().getFullYear()}</span>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </footer>
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Sign In</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[90vh]">
            <LoginPage
              compact
              onLoginSuccess={() => setShowLoginModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-lg" data-ocid="invite.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Invite Link Generated
            </DialogTitle>
            <DialogDescription>
              Share this link with the person you want to invite. It can only be
              used once and expires after use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label
                htmlFor="invite-url-input"
                className="text-sm font-medium text-foreground"
              >
                Invite URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="invite-url-input"
                  data-ocid="invite.input"
                  value={inviteUrl}
                  readOnly
                  className="font-mono text-xs bg-muted"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  data-ocid="invite.copy.button"
                  onClick={handleCopyInvite}
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-foreground">
                How it works:
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Send this link to the new user</li>
                <li>They open the link and register with their email</li>
                <li>The invite token is automatically pre-filled</li>
                <li>Once used, the invite is invalidated</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                data-ocid="invite.close_button"
                onClick={() => setShowInviteDialog(false)}
              >
                Close
              </Button>
              <Button
                data-ocid="invite.open_button"
                onClick={() => window.open(inviteUrl, "_blank")}
                className="gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
