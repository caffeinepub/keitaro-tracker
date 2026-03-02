import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useGetAllCampaigns, useGetClicksLog } from "../hooks/useQueries";

const PAGE_SIZE = 50;

function formatTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function DeviceBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    mobile: "bg-info/10 text-info border-info/20 border",
    desktop: "bg-primary/10 text-primary border-primary/20 border",
    tablet: "bg-warning/10 text-warning border-warning/20 border",
  };
  const key = type.toLowerCase();
  const cls = colors[key] ?? "bg-muted text-muted-foreground border";
  return <Badge className={`${cls} text-xs capitalize`}>{type || "—"}</Badge>;
}

export default function ClicksLogPage() {
  const [page, setPage] = useState(0);
  const { data: clicks, isLoading } = useGetClicksLog(page, PAGE_SIZE);
  const { data: campaigns } = useGetAllCampaigns();

  const campaignMap = campaigns
    ? Object.fromEntries(campaigns.map((c) => [c.id, c.name]))
    : {};

  const hasNext = clicks && clicks.length === PAGE_SIZE;
  const hasPrev = page > 0;

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">Clicks Log</h2>
          <p className="text-sm text-muted-foreground">
            Page {page + 1} · {clicks?.length ?? 0} records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={!hasPrev || isLoading}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          <span className="text-sm font-mono px-2">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext || isLoading}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        {isLoading ? (
          <div className="p-5 space-y-3">
            {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
              <Skeleton key={k} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Time
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Campaign
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Country
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    OS
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Browser
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Device
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    IP
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground pr-5">
                    Referrer
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!clicks || clicks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-16 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <MousePointerClick className="w-8 h-8 opacity-30" />
                        <p className="text-sm font-medium">
                          No clicks recorded yet
                        </p>
                        <p className="text-xs">
                          Clicks will appear here once tracking is active
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  clicks.map((click) => (
                    <TableRow
                      key={click.id}
                      className="border-border hover:bg-accent/20 transition-colors"
                    >
                      <TableCell className="pl-5 font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {formatTime(click.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[120px]">
                        <span className="truncate block">
                          {campaignMap[click.campaignId] ??
                            click.campaignId.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">
                            {click.country || "—"}
                          </span>
                          {click.city && (
                            <span className="text-xs text-muted-foreground">
                              {click.city}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {click.os || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {click.browser || "—"}
                      </TableCell>
                      <TableCell>
                        <DeviceBadge type={click.deviceType} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {click.ipAddress || "—"}
                      </TableCell>
                      <TableCell className="pr-5 max-w-[160px]">
                        {click.referrerUrl ? (
                          <span
                            className="text-xs font-mono text-muted-foreground truncate block"
                            title={click.referrerUrl}
                          >
                            {click.referrerUrl}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">
                            direct
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
