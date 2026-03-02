import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BarChart3, Download } from "lucide-react";
import { motion } from "motion/react";
import { useGetAllCampaigns, useGetCampaignStats } from "../hooks/useQueries";

function formatMoney(cents: bigint): string {
  return (Number(cents) / 100).toFixed(2);
}

function formatBigPercent(val: bigint): string {
  return (Number(val) * 0.01).toFixed(2);
}

function formatNumber(val: bigint): string {
  return Number(val).toLocaleString("en-US");
}

export default function ReportsPage() {
  const { data: statsData, isLoading: statsLoading } = useGetCampaignStats();
  const { data: campaigns } = useGetAllCampaigns();

  const campaignMap = campaigns
    ? Object.fromEntries(campaigns.map((c) => [c.id, c.name]))
    : {};

  const stats = statsData ?? [];

  const totals = stats.reduce(
    (acc, s) => ({
      clicks: acc.clicks + Number(s.clicks),
      uniqueClicks: acc.uniqueClicks + Number(s.uniqueClicks),
      conversions: acc.conversions + Number(s.conversions),
      revenue: acc.revenue + Number(s.revenue),
      cost: acc.cost + Number(s.cost),
    }),
    { clicks: 0, uniqueClicks: 0, conversions: 0, revenue: 0, cost: 0 },
  );

  const totalCR =
    totals.clicks > 0
      ? ((totals.conversions / totals.clicks) * 100).toFixed(2)
      : "0.00";

  const totalROI =
    totals.cost > 0
      ? (((totals.revenue - totals.cost) / totals.cost) * 100).toFixed(2)
      : "0.00";

  const handleExportCSV = () => {
    if (!stats.length) return;
    const headers = [
      "Campaign",
      "Clicks",
      "Unique Clicks",
      "Conversions",
      "CR%",
      "Revenue",
      "Cost",
      "ROI%",
      "EPC",
    ];
    const rows = stats.map((s) => [
      campaignMap[s.campaignId] ?? s.campaignId,
      formatNumber(s.clicks),
      formatNumber(s.uniqueClicks),
      formatNumber(s.conversions),
      formatBigPercent(s.conversionRate),
      formatMoney(s.revenue),
      formatMoney(s.cost),
      formatBigPercent(s.roi),
      (Number(s.epc) / 100).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ktracker-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Campaign performance summary
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={!stats.length}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Summary row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-2 sm:grid-cols-5 gap-3"
      >
        {[
          { label: "Total Clicks", value: totals.clicks.toLocaleString() },
          {
            label: "Unique Clicks",
            value: totals.uniqueClicks.toLocaleString(),
          },
          { label: "Conversions", value: totals.conversions.toLocaleString() },
          { label: "Revenue", value: `$${(totals.revenue / 100).toFixed(2)}` },
          { label: "Cost", value: `$${(totals.cost / 100).toFixed(2)}` },
        ].map((item) => (
          <Card key={item.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {item.label}
              </p>
              <p className="font-display text-xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="bg-card border-border">
          <CardHeader className="px-5 py-4 border-b border-border flex flex-row items-center space-y-0">
            <CardTitle className="font-display text-sm font-semibold">
              Campaign Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {statsLoading ? (
              <div className="p-5 space-y-3">
                {["a", "b", "c", "d", "e", "f"].map((k) => (
                  <Skeleton key={k} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="pl-5 text-xs font-medium text-muted-foreground">
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
                        ROI%
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
                          className="text-center py-16 text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <BarChart3 className="w-8 h-8 opacity-30" />
                            <p className="text-sm font-medium">
                              No report data available
                            </p>
                            <p className="text-xs">
                              Run campaigns and record clicks to generate
                              reports
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.map((s) => {
                        const roi = Number(s.roi) * 0.01;
                        const roiPos = roi >= 0;
                        return (
                          <TableRow
                            key={s.campaignId}
                            className="border-border hover:bg-accent/20 transition-colors"
                          >
                            <TableCell className="pl-5 font-medium text-sm">
                              {campaignMap[s.campaignId] ??
                                s.campaignId.slice(0, 8)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatNumber(s.clicks)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">
                              {formatNumber(s.uniqueClicks)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatNumber(s.conversions)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-info">
                              {formatBigPercent(s.conversionRate)}%
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-success">
                              ${formatMoney(s.revenue)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">
                              ${formatMoney(s.cost)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="outline"
                                className={`font-mono text-xs ${roiPos ? "border-success/30 text-success" : "border-destructive/30 text-destructive"}`}
                              >
                                {roiPos ? "+" : ""}
                                {roi.toFixed(2)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm pr-5">
                              ${(Number(s.epc) / 100).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Total row */}
                {stats.length > 0 && (
                  <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      TOTALS
                    </span>
                    <div className="flex items-center gap-8 text-xs font-mono">
                      <span>{totals.clicks.toLocaleString()} clicks</span>
                      <span className="text-info">{totalCR}% CR</span>
                      <span className="text-success">
                        ${(totals.revenue / 100).toFixed(2)} rev
                      </span>
                      <span className="text-muted-foreground">
                        ${(totals.cost / 100).toFixed(2)} cost
                      </span>
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs ${Number(totalROI) >= 0 ? "border-success/30 text-success" : "border-destructive/30 text-destructive"}`}
                      >
                        {Number(totalROI) >= 0 ? "+" : ""}
                        {totalROI}% ROI
                      </Badge>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
