import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useGetErrorLog } from "../hooks/useQueries";

function formatTimestamp(ts: bigint): string {
  // Backend timestamps are in nanoseconds
  const ms = Number(ts / BigInt(1_000_000));
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ErrorLogPage() {
  const { data: logs = [], isLoading, refetch } = useGetErrorLog();
  const queryClient = useQueryClient();

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Error Log
          </h2>
          <p className="text-sm text-muted-foreground">
            {logs.length} error{logs.length !== 1 ? "s" : ""} recorded — system
            and authentication errors
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="error-log.secondary_button"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["errorLog"] });
            refetch();
          }}
          className="gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="pl-5 text-xs font-medium text-muted-foreground w-48">
                Time
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground w-40">
                Context
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground pr-5">
                Message
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12">
                  <div
                    data-ocid="error-log.loading_state"
                    className="flex flex-col items-center gap-3 text-muted-foreground"
                  >
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading errors...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-20 text-muted-foreground"
                >
                  <div
                    data-ocid="error-log.empty_state"
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-success opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No errors logged</p>
                      <p className="text-xs mt-1 text-muted-foreground/70">
                        System and authentication errors will appear here
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((entry, idx) => (
                <TableRow
                  key={entry.id}
                  data-ocid={`error-log.item.${idx + 1}`}
                  className="border-border hover:bg-accent/20 transition-colors"
                >
                  <TableCell className="pl-5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded-md">
                      {entry.context}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-foreground pr-5 break-all">
                    {entry.message}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
