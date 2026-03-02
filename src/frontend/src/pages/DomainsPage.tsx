import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Globe, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Domain } from "../backend.d";
import { DomainStatus, DomainType } from "../backend.d";
import {
  useCreateDomain,
  useDeleteDomain,
  useGetAllDomains,
  useUpdateDomain,
} from "../hooks/useQueries";

function getTypeBadge(type: DomainType) {
  switch (type) {
    case DomainType.campaign:
      return (
        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 border text-xs">
          Campaign
        </Badge>
      );
    case DomainType.postback:
      return (
        <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 border text-xs">
          Postback
        </Badge>
      );
    case DomainType.admin:
      return (
        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 border text-xs">
          Admin
        </Badge>
      );
  }
}

function getStatusBadge(status: DomainStatus) {
  switch (status) {
    case DomainStatus.active:
      return (
        <Badge className="bg-success/10 text-success border-success/20 border text-xs">
          Active
        </Badge>
      );
    case DomainStatus.inactive:
      return (
        <Badge className="bg-muted text-muted-foreground border text-xs">
          Inactive
        </Badge>
      );
  }
}

function formatDate(ts: bigint) {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface DnsPopoverProps {
  domain: Domain;
}

function DnsPopover({ domain }: DnsPopoverProps) {
  const host = window.location.hostname;
  const cnameValue = host;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="DNS Instructions"
        >
          <Info className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold mb-1">
              DNS Setup for {domain.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Add the following DNS record to your domain registrar:
            </p>
          </div>
          <div className="space-y-2">
            <div className="rounded-md bg-muted/60 border border-border p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">
                  Type
                </span>
                <span className="text-xs font-mono font-semibold">CNAME</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">
                  Name
                </span>
                <span className="text-xs font-mono">{domain.name}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium shrink-0">
                  Value
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs font-mono truncate text-primary">
                    {cnameValue}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cnameValue)}
                    className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Alternatively, use an{" "}
              <span className="font-semibold">A record</span> pointing to the
              same host IP if CNAME is not supported at root level.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DomainFormProps {
  open: boolean;
  onClose: () => void;
  editingDomain?: Domain;
}

function DomainForm({ open, onClose, editingDomain }: DomainFormProps) {
  const createDomain = useCreateDomain();
  const updateDomain = useUpdateDomain();

  const [name, setName] = useState(editingDomain?.name ?? "");
  const [domainType, setDomainType] = useState<DomainType>(
    editingDomain?.domainType ?? DomainType.campaign,
  );
  const [status, setStatus] = useState<DomainStatus>(
    editingDomain?.status ?? DomainStatus.active,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Domain name is required");
      return;
    }
    // basic domain validation
    if (
      !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
        trimmedName,
      )
    ) {
      toast.error("Please enter a valid domain name (e.g. track.example.com)");
      return;
    }

    try {
      if (editingDomain) {
        await updateDomain.mutateAsync({
          id: editingDomain.id,
          name: trimmedName,
          domainType,
          status,
        });
        toast.success("Domain updated");
      } else {
        await createDomain.mutateAsync({
          name: trimmedName,
          domainType,
          status,
        });
        toast.success("Domain added");
      }
      onClose();
    } catch {
      toast.error("Failed to save domain");
    }
  };

  const isPending = createDomain.isPending || updateDomain.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingDomain ? "Edit Domain" : "Add Domain"}
          </DialogTitle>
          <DialogDescription>
            {editingDomain
              ? "Update domain configuration"
              : "Add a custom domain for campaigns, postbacks, or admin access"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain-name">Domain Name *</Label>
            <Input
              id="domain-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="track.example.com"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Enter the full subdomain or domain (e.g. track.example.com)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={domainType}
              onValueChange={(v) => setDomainType(v as DomainType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DomainType.campaign}>
                  Campaign — for tracking links
                </SelectItem>
                <SelectItem value={DomainType.postback}>
                  Postback — for conversion URLs
                </SelectItem>
                <SelectItem value={DomainType.admin}>
                  Admin — for admin panel access
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as DomainStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DomainStatus.active}>Active</SelectItem>
                <SelectItem value={DomainStatus.inactive}>Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : editingDomain
                  ? "Update"
                  : "Add Domain"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DomainsPage() {
  const { data: domains, isLoading } = useGetAllDomains();
  const deleteDomain = useDeleteDomain();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDomain.mutateAsync(id);
      toast.success("Domain removed");
      setDeletingId(null);
    } catch {
      toast.error("Failed to delete domain");
    }
  };

  const openEdit = (domain: Domain) => {
    setEditing(domain);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(undefined);
  };

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">Domains</h2>
          <p className="text-sm text-muted-foreground">
            {domains?.length ?? 0} domain{domains?.length !== 1 ? "s" : ""}{" "}
            configured
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        {isLoading ? (
          <div className="p-5 space-y-3">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-5 text-xs font-medium text-muted-foreground">
                  Domain Name
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  DNS
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Created
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right pr-5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!domains || domains.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-20 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                        <Globe className="w-6 h-6 opacity-40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          No domains configured yet
                        </p>
                        <p className="text-xs mt-1 text-muted-foreground/70">
                          Add your first domain to start tracking campaigns with
                          custom URLs
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1"
                        onClick={() => {
                          setEditing(undefined);
                          setFormOpen(true);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add Domain
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                domains.map((domain) => (
                  <TableRow
                    key={domain.id}
                    className="border-border hover:bg-accent/20 transition-colors"
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono text-sm font-medium">
                          {domain.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(domain.domainType)}</TableCell>
                    <TableCell>{getStatusBadge(domain.status)}</TableCell>
                    <TableCell>
                      <DnsPopover domain={domain} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(domain.createdAt)}
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(domain)}
                          title="Edit domain"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={() => setDeletingId(domain.id)}
                          title="Delete domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Domain Form */}
      {formOpen && (
        <DomainForm
          open={formOpen}
          onClose={closeForm}
          editingDomain={editing}
        />
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Domain</DialogTitle>
            <DialogDescription>
              This will remove the domain from your tracker. Campaigns using
              this domain may stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteDomain.isPending}
            >
              {deleteDomain.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
