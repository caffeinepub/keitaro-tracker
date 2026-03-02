import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { getAllActivityLogs } from "../utils/activityLog";

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getActionBadge(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("created") || lower.includes("create")) {
    return (
      <Badge className="bg-success/10 text-success border-success/20 border text-xs">
        {action}
      </Badge>
    );
  }
  if (lower.includes("updated") || lower.includes("update")) {
    return (
      <Badge className="bg-info/10 text-info border-info/20 border text-xs">
        {action}
      </Badge>
    );
  }
  if (lower.includes("deleted") || lower.includes("delete")) {
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20 border text-xs">
        {action}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      {action}
    </Badge>
  );
}

function getEntityTypeBadge(entityType: string) {
  const colors: Record<string, string> = {
    Campaign: "bg-blue-500/10 text-blue-500 border-blue-500/20 border",
    Offer: "bg-purple-500/10 text-purple-500 border-purple-500/20 border",
    "Traffic Source":
      "bg-orange-500/10 text-orange-500 border-orange-500/20 border",
    Flow: "bg-teal-500/10 text-teal-500 border-teal-500/20 border",
    Domain: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 border",
  };
  const cls = colors[entityType] || "bg-muted text-muted-foreground border";
  return <Badge className={`${cls} text-xs`}>{entityType}</Badge>;
}

export default function ActivityLogPage() {
  const logs = useMemo(() => getAllActivityLogs(), []);

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">Activity Log</h2>
          <p className="text-sm text-muted-foreground">
            {logs.length} action{logs.length !== 1 ? "s" : ""} recorded — shared
            across all users
          </p>
        </div>
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
              <TableHead className="pl-5 text-xs font-medium text-muted-foreground">
                Time
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                User
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Action
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Entity Type
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground pr-5">
                Entity Name
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-20 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 opacity-40" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No activity yet</p>
                      <p className="text-xs mt-1 text-muted-foreground/70">
                        Actions like creating campaigns, offers, and traffic
                        sources will appear here
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="border-border hover:bg-accent/20 transition-colors"
                >
                  <TableCell className="pl-5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{entry.actor}</span>
                  </TableCell>
                  <TableCell>{getActionBadge(entry.action)}</TableCell>
                  <TableCell>{getEntityTypeBadge(entry.entityType)}</TableCell>
                  <TableCell className="text-sm text-foreground pr-5">
                    {entry.entityName}
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
