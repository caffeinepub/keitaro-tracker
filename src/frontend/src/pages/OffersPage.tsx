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
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Offer } from "../backend.d";
import { OfferStatus } from "../backend.d";
import {
  useCreateOffer,
  useDeleteOffer,
  useGetAllOffers,
  useUpdateOffer,
} from "../hooks/useQueries";
import { getCreatorByEntityId } from "../utils/activityLog";

function getStatusBadge(status: OfferStatus) {
  return status === OfferStatus.active ? (
    <Badge className="bg-success/10 text-success border-success/20 border text-xs">
      Active
    </Badge>
  ) : (
    <Badge className="bg-warning/10 text-warning border-warning/20 border text-xs">
      Paused
    </Badge>
  );
}

interface OfferFormProps {
  open: boolean;
  onClose: () => void;
  editingOffer?: Offer;
}

function OfferForm({ open, onClose, editingOffer }: OfferFormProps) {
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();

  // Decode any URL-encoded macro braces so {click_id} is always shown/stored literally
  const decodeMacros = (value: string) =>
    value.replace(/%7B/gi, "{").replace(/%7D/gi, "}");

  const [name, setName] = useState(editingOffer?.name ?? "");
  const [url, setUrl] = useState(decodeMacros(editingOffer?.url ?? ""));
  const [payout, setPayout] = useState(
    editingOffer ? String(Number(editingOffer.payout) / 100) : "",
  );
  const [currency, setCurrency] = useState(editingOffer?.currency ?? "USD");
  const [status, setStatus] = useState<OfferStatus>(
    editingOffer?.status ?? OfferStatus.active,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Offer name is required");
      return;
    }
    if (!url.trim()) {
      toast.error("Offer URL is required");
      return;
    }
    if (!payout || Number.isNaN(Number(payout))) {
      toast.error("Valid payout is required");
      return;
    }

    const payoutCents = BigInt(Math.round(Number.parseFloat(payout) * 100));
    // Always send the decoded URL so {click_id} is stored as a literal macro,
    // not as %7Bclick_id%7D which the backend string-replace would miss.
    const normalizedUrl = decodeMacros(url.trim());

    try {
      if (editingOffer) {
        await updateOffer.mutateAsync({
          id: editingOffer.id,
          name: name.trim(),
          url: normalizedUrl,
          payout: payoutCents,
          currency,
          status,
        });
        toast.success("Offer updated");
      } else {
        await createOffer.mutateAsync({
          name: name.trim(),
          url: normalizedUrl,
          payout: payoutCents,
          currency,
          status,
        });
        toast.success("Offer created");
      }
      onClose();
    } catch {
      toast.error("Failed to save offer");
    }
  };

  const isPending = createOffer.isPending || updateOffer.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingOffer ? "Edit Offer" : "New Offer"}</DialogTitle>
          <DialogDescription>
            {editingOffer ? "Update offer details" : "Add a new offer to track"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offer-name">Name *</Label>
            <Input
              id="offer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Offer name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-url">URL *</Label>
            <Input
              id="offer-url"
              value={url}
              onChange={(e) => setUrl(decodeMacros(e.target.value))}
              onBlur={(e) => setUrl(decodeMacros(e.target.value))}
              placeholder="https://offer.example.com/lp?click={click_id}"
            />
            <p className="text-xs text-muted-foreground">
              Use{" "}
              <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">
                {"{click_id}"}
              </code>{" "}
              macro to pass the click ID to the offer (e.g.{" "}
              <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">
                ?cid={"{click_id}"}
              </code>
              )
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="offer-payout">Payout *</Label>
              <Input
                id="offer-payout"
                type="number"
                min="0"
                step="0.01"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["USD", "EUR", "GBP", "RUB", "UAH", "BRL", "AUD", "CAD"].map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as OfferStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OfferStatus.active}>Active</SelectItem>
                <SelectItem value={OfferStatus.paused}>Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : editingOffer ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function OffersPage() {
  const { data: offers, isLoading } = useGetAllOffers();
  const deleteOffer = useDeleteOffer();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const offer = offers?.find((o) => o.id === id);
    try {
      await deleteOffer.mutateAsync({ id, name: offer?.name ?? id });
      toast.success("Offer deleted");
      setDeletingId(null);
    } catch {
      toast.error("Failed to delete offer");
    }
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
          <h2 className="font-display text-lg font-semibold">Offers</h2>
          <p className="text-sm text-muted-foreground">
            {offers?.length ?? 0} total offers
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
          New Offer
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
            {["a", "b", "c", "d", "e"].map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-5 text-xs font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  URL
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">
                  Payout
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Currency
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Created by
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right pr-5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!offers || offers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Tag className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">No offers yet</p>
                      <p className="text-xs">Add your first offer to track</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((offer) => (
                  <TableRow
                    key={offer.id}
                    className="border-border hover:bg-accent/20 transition-colors"
                  >
                    <TableCell className="pl-5 font-medium text-sm">
                      {offer.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">
                      <span className="truncate block font-mono text-xs">
                        {offer.url}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-success">
                      ${(Number(offer.payout) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">{offer.currency}</TableCell>
                    <TableCell>{getStatusBadge(offer.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {getCreatorByEntityId(offer.id) ?? (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(offer);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={() => setDeletingId(offer.id)}
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

      {formOpen && (
        <OfferForm open={formOpen} onClose={closeForm} editingOffer={editing} />
      )}

      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Offer</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteOffer.isPending}
            >
              {deleteOffer.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
