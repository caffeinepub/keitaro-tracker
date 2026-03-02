import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  BarChart3,
  DollarSign,
  MousePointerClick,
  Percent,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useGetAllCampaigns, useGetCampaignStats } from "../hooks/useQueries";

function formatMoney(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(val: bigint): string {
  return `${(Number(val) * 0.01).toFixed(2)}%`;
}

function formatNumber(val: bigint): string {
  return Number(val).toLocaleString("en-US");
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  index: number;
}

function StatCard({ title, value, icon: Icon, loading, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
    >
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {title}
              </p>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="font-display text-2xl font-bold">{value}</p>
              )}
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useGetCampaignStats();
  const { data: campaigns, isLoading: campaignsLoading } = useGetAllCampaigns();

  const loading = statsLoading || campaignsLoading;

  const stats = statsData ?? [];
  const campaignNameMap = campaigns
    ? Object.fromEntries(campaigns.map((c) => [c.id, c.name]))
    : {};

  const totals = stats.reduce(
    (acc, s) => ({
      clicks: acc.clicks + Number(s.clicks),
      conversions: acc.conversions + Number(s.conversions),
      revenue: acc.revenue + Number(s.revenue),
      cost: acc.cost + Number(s.cost),
    }),
    { clicks: 0, conversions: 0, revenue: 0, cost: 0 },
  );

  const totalROI =
    totals.cost > 0
      ? `${(((totals.revenue - totals.cost) / totals.cost) * 100).toFixed(2)}%`
      : "—";

  const activeCampaigns = campaigns
    ? campaigns.filter(
        (c) =>
          typeof c.status === "object" &&
          c.status !== null &&
          "active" in (c.status as Record<string, unknown>),
      )
    : [];

  return (
    <div className="p-6 space-y-6" data-ocid="dashboard.page">
      {/* Summary Cards */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        data-ocid="dashboard.stats.section"
      >
        <StatCard
          title="Total Clicks"
          value={totals.clicks.toLocaleString("en-US")}
          icon={MousePointerClick}
          loading={loading}
          index={0}
        />
        <StatCard
          title="Conversions"
          value={totals.conversions.toLocaleString("en-US")}
          icon={Activity}
          loading={loading}
          index={1}
        />
        <StatCard
          title="Total Revenue"
          value={loading ? "—" : formatMoney(BigInt(totals.revenue))}
          icon={DollarSign}
          loading={loading}
          index={2}
        />
        <StatCard
          title="Overall ROI"
          value={loading ? "—" : totalROI}
          icon={TrendingUp}
          loading={loading}
          index={3}
        />
      </div>

      {/* Active Campaigns Count */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.3 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Activity className="w-4 h-4 text-success" />
          <span>
            {activeCampaigns.length} active campaign
            {activeCampaigns.length !== 1 ? "s" : ""} out of{" "}
            {(campaigns ?? []).length} total
          </span>
        </motion.div>
      )}

      {/* Campaign Stats Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
      >
        <Card className="bg-card border-border">
          <CardHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-sm font-semibold">
              Campaign Performance
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Real-time data</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div
                className="p-5 space-y-3"
                data-ocid="dashboard.table.loading_state"
              >
                {["a", "b", "c", "d", "e"].map((k) => (
                  <Skeleton key={k} className="h-9 w-full" />
                ))}
              </div>
            ) : stats.length === 0 ? (
              <div
                className="flex flex-col items-center gap-2 py-16 text-muted-foreground"
                data-ocid="dashboard.table.empty_state"
              >
                <BarChart3 className="w-10 h-10 opacity-25" />
                <p className="text-sm font-medium">No campaign data yet</p>
                <p className="text-xs text-center max-w-xs">
                  Create campaigns and add streams with offers — clicks and
                  conversions will appear here automatically.
                </p>
              </div>
            ) : (
              <Table data-ocid="dashboard.campaigns.table">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground pl-5">
                      Campaign
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      Clicks
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      Uniq.
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      Conv.
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      CR%
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      Revenue
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      Cost
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      ROI
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right pr-5">
                      EPC
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat, idx) => {
                    const roi = Number(stat.roi) * 0.01;
                    const roiPositive = roi >= 0;
                    return (
                      <TableRow
                        key={stat.campaignId}
                        className="border-border hover:bg-accent/30 transition-colors"
                        data-ocid={`dashboard.campaigns.row.${idx + 1}`}
                      >
                        <TableCell className="pl-5 font-medium text-sm">
                          {campaignNameMap[stat.campaignId] ??
                            stat.campaignId.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(stat.clicks)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatNumber(stat.uniqueClicks)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(stat.conversions)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-info">
                            {formatPercent(stat.conversionRate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-success">
                          {formatMoney(stat.revenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatMoney(stat.cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs ${roiPositive ? "border-success/30 text-success" : "border-destructive/30 text-destructive"}`}
                          >
                            {roiPositive ? "+" : ""}
                            {roi.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm pr-5">
                          <span className="flex items-center justify-end gap-1">
                            <Percent className="w-3 h-3 text-muted-foreground" />
                            ${(Number(stat.epc) / 100).toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
