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
import { ChevronLeft, ChevronRight, Repeat2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { ConversionStatus } from "../backend.d";
import {
  useGetAllCampaigns,
  useGetAllOffers,
  useGetConversionsLog,
} from "../hooks/useQueries";

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

function StatusBadge({ status }: { status: ConversionStatus }) {
  switch (status) {
    case ConversionStatus.approved:
      return (
        <Badge className="bg-success/10 text-success border-success/20 border text-xs">
          Approved
        </Badge>
      );
    case ConversionStatus.pending:
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 border text-xs">
          Pending
        </Badge>
      );
    case ConversionStatus.declined:
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 border text-xs">
          Declined
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {String(status)}
        </Badge>
      );
  }
}

export default function ConversionsLogPage() {
  const [page, setPage] = useState(0);
  const { data: conversions, isLoading } = useGetConversionsLog(
    page,
    PAGE_SIZE,
  );
  const { data: campaigns } = useGetAllCampaigns();
  const { data: offers } = useGetAllOffers();

  const campaignMap = campaigns
    ? Object.fromEntries(campaigns.map((c) => [c.id, c.name]))
    : {};

  const offerMap = offers
    ? Object.fromEntries(offers.map((o) => [o.id, o.name]))
    : {};

  const hasNext = conversions && conversions.length === PAGE_SIZE;
  const hasPrev = page > 0;

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">
            Conversions Log
          </h2>
          <p className="text-sm text-muted-foreground">
            Page {page + 1} · {conversions?.length ?? 0} records
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
                  Offer
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">
                  Payout
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">
                  Revenue
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground pr-5 font-mono">
                  Click ID
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!conversions || conversions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Repeat2 className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">
                        No conversions recorded yet
                      </p>
                      <p className="text-xs">
                        Conversions will appear here once tracking is active
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                conversions.map((conv) => (
                  <TableRow
                    key={conv.id}
                    className="border-border hover:bg-accent/20 transition-colors"
                  >
                    <TableCell className="pl-5 font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {formatTime(conv.timestamp)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[120px]">
                      <span className="truncate block">
                        {campaignMap[conv.campaignId] ??
                          conv.campaignId.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm max-w-[120px]">
                      <span className="truncate block text-muted-foreground">
                        {offerMap[conv.offerId] ?? conv.offerId.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${(Number(conv.payout) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-success">
                      ${(Number(conv.revenue) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={conv.status} />
                    </TableCell>
                    <TableCell className="pr-5 font-mono text-xs text-muted-foreground">
                      {conv.clickId.slice(0, 12)}…
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </motion.div>
    </div>
  );
}
