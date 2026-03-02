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
  ArrowUpRight,
  BarChart3,
  DollarSign,
  MousePointerClick,
  Percent,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import type { CampaignStats } from "../backend.d";
import { useGetAllCampaigns, useGetCampaignStats } from "../hooks/useQueries";

const SAMPLE_STATS: CampaignStats[] = [
  {
    campaignId: "sample-1",
    clicks: BigInt(12450),
    uniqueClicks: BigInt(9820),
    conversions: BigInt(342),
    conversionRate: BigInt(275),
    revenue: BigInt(1895000),
    cost: BigInt(420000),
    roi: BigInt(35100),
    epc: BigInt(152),
  },
  {
    campaignId: "sample-2",
    clicks: BigInt(8930),
    uniqueClicks: BigInt(7210),
    conversions: BigInt(198),
    conversionRate: BigInt(221),
    revenue: BigInt(1240000),
    cost: BigInt(310000),
    roi: BigInt(30000),
    epc: BigInt(138),
  },
  {
    campaignId: "sample-3",
    clicks: BigInt(5670),
    uniqueClicks: BigInt(4890),
    conversions: BigInt(89),
    conversionRate: BigInt(157),
    revenue: BigInt(623000),
    cost: BigInt(198000),
    roi: BigInt(21464),
    epc: BigInt(109),
  },
];

const SAMPLE_CAMPAIGNS: Record<string, string> = {
  "sample-1": "US Finance Offers",
  "sample-2": "EU E-commerce Flow",
  "sample-3": "Asia Mobile Push",
};

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
  trend?: string;
  index: number;
}

function StatCard({ title, value, icon: Icon, trend, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
    >
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {title}
              </p>
              <p className="font-display text-2xl font-bold">{value}</p>
              {trend && (
                <p className="text-xs text-success flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {trend}
                </p>
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
  const { data: campaigns } = useGetAllCampaigns();

  const stats = statsData && statsData.length > 0 ? statsData : SAMPLE_STATS;
  const campaignNameMap = campaigns
    ? Object.fromEntries(campaigns.map((c) => [c.id, c.name]))
    : SAMPLE_CAMPAIGNS;

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
      : "0%";

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clicks"
          value={totals.clicks.toLocaleString("en-US")}
          icon={MousePointerClick}
          trend="+12.5% vs last week"
          index={0}
        />
        <StatCard
          title="Conversions"
          value={totals.conversions.toLocaleString("en-US")}
          icon={Activity}
          trend="+8.3% vs last week"
          index={1}
        />
        <StatCard
          title="Total Revenue"
          value={formatMoney(BigInt(totals.revenue))}
          icon={DollarSign}
          trend="+15.2% vs last week"
          index={2}
        />
        <StatCard
          title="Overall ROI"
          value={totalROI}
          icon={TrendingUp}
          trend="+3.1% vs last week"
          index={3}
        />
      </div>

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
              <span>Top campaigns by revenue</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {statsLoading ? (
              <div className="p-5 space-y-3">
                {["a", "b", "c", "d", "e"].map((k) => (
                  <Skeleton key={k} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <Table>
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
                  {stats.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <BarChart3 className="w-8 h-8 opacity-30" />
                          <p className="text-sm">No campaign data yet</p>
                          <p className="text-xs">
                            Create campaigns to see statistics here
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.map((stat) => {
                      const roi = Number(stat.roi) * 0.01;
                      const roiPositive = roi >= 0;
                      return (
                        <TableRow
                          key={stat.campaignId}
                          className="border-border hover:bg-accent/30 transition-colors"
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
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
