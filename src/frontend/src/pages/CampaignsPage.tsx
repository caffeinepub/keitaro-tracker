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
import { Activity, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Campaign, OfferWeight } from "../backend.d";
import { CampaignStatus, DomainType } from "../backend.d";
import {
  useCreateCampaign,
  useDeleteCampaign,
  useGetAllCampaigns,
  useGetAllDomains,
  useGetAllOffers,
  useGetAllTrafficSources,
  useGetCampaignStats,
  useUpdateCampaign,
} from "../hooks/useQueries";

interface OfferWeightRow {
  _key: number;
  offerId: string;
  weight: number;
}

function getStatusBadge(status: CampaignStatus) {
  switch (status) {
    case CampaignStatus.active:
      return (
        <Badge className="bg-success/10 text-success border-success/20 border text-xs">
          Active
        </Badge>
      );
    case CampaignStatus.paused:
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 border text-xs">
          Paused
        </Badge>
      );
    case CampaignStatus.archived:
      return (
        <Badge className="bg-muted text-muted-foreground border text-xs">
          Archived
        </Badge>
      );
  }
}

interface CampaignFormProps {
  open: boolean;
  onClose: () => void;
  editingCampaign?: Campaign;
}

function CampaignForm({ open, onClose, editingCampaign }: CampaignFormProps) {
  const { data: trafficSources } = useGetAllTrafficSources();
  const { data: offers } = useGetAllOffers();
  const { data: domains } = useGetAllDomains();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();

  const campaignDomains =
    domains?.filter((d) => d.domainType === DomainType.campaign) ?? [];

  const [name, setName] = useState(editingCampaign?.name ?? "");
  const [trafficSourceId, setTrafficSourceId] = useState(
    editingCampaign?.trafficSourceId ?? "",
  );
  const [status, setStatus] = useState<CampaignStatus>(
    editingCampaign?.status ?? CampaignStatus.active,
  );
  const [trackingDomain, setTrackingDomain] = useState(
    editingCampaign?.trackingDomain ?? "",
  );
  const [offerWeights, setOfferWeights] = useState<OfferWeightRow[]>(
    editingCampaign?.offerIds.map((o, i) => ({
      _key: i,
      offerId: o.offerId,
      weight: Number(o.weight),
    })) ?? [],
  );
  const [nextOfferKey, setNextOfferKey] = useState(
    editingCampaign?.offerIds.length ?? 0,
  );

  const addOffer = () => {
    setOfferWeights([
      ...offerWeights,
      { _key: nextOfferKey, offerId: "", weight: 1 },
    ]);
    setNextOfferKey((k) => k + 1);
  };

  const removeOffer = (key: number) => {
    setOfferWeights(offerWeights.filter((r) => r._key !== key));
  };

  const updateOfferRow = (
    key: number,
    field: "offerId" | "weight",
    val: string,
  ) => {
    setOfferWeights((prev) =>
      prev.map((row) =>
        row._key === key
          ? {
              ...row,
              [field]: field === "weight" ? Number.parseInt(val) || 1 : val,
            }
          : row,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!trafficSourceId) {
      toast.error("Traffic source is required");
      return;
    }

    const offerIds: OfferWeight[] = offerWeights
      .filter((o) => o.offerId)
      .map((o) => ({ offerId: o.offerId, weight: BigInt(o.weight) }));

    try {
      if (editingCampaign) {
        await updateCampaign.mutateAsync({
          id: editingCampaign.id,
          name: name.trim(),
          trafficSourceId,
          offerIds,
          status,
          trackingDomain: trackingDomain.trim(),
        });
        toast.success("Campaign updated");
      } else {
        await createCampaign.mutateAsync({
          name: name.trim(),
          trafficSourceId,
          offerIds,
          status,
          trackingDomain: trackingDomain.trim(),
        });
        toast.success("Campaign created");
      }
      onClose();
    } catch {
      toast.error("Failed to save campaign");
    }
  };

  const isPending = createCampaign.isPending || updateCampaign.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingCampaign ? "Edit Campaign" : "New Campaign"}
          </DialogTitle>
          <DialogDescription>
            {editingCampaign
              ? "Update campaign settings"
              : "Create a new tracking campaign"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="camp-name">Name *</Label>
            <Input
              id="camp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name"
            />
          </div>
          <div className="space-y-2">
            <Label>Traffic Source *</Label>
            <Select value={trafficSourceId} onValueChange={setTrafficSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select traffic source" />
              </SelectTrigger>
              <SelectContent>
                {trafficSources?.map((ts) => (
                  <SelectItem key={ts.id} value={ts.id}>
                    {ts.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CampaignStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CampaignStatus.active}>Active</SelectItem>
                <SelectItem value={CampaignStatus.paused}>Paused</SelectItem>
                <SelectItem value={CampaignStatus.archived}>
                  Archived
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tracking Domain</Label>
            {campaignDomains.length > 0 ? (
              <Select value={trackingDomain} onValueChange={setTrackingDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign domain" />
                </SelectTrigger>
                <SelectContent>
                  {campaignDomains.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                No campaign domains configured — add one in the Domains section
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Offers & Weights</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOffer}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Offer
              </Button>
            </div>
            {offerWeights.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No offers added. Click "Add Offer" to add.
              </p>
            )}
            {offerWeights.map((row) => (
              <div key={row._key} className="flex gap-2 items-center">
                <Select
                  value={row.offerId}
                  onValueChange={(v) => updateOfferRow(row._key, "offerId", v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select offer" />
                  </SelectTrigger>
                  <SelectContent>
                    {offers?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={row.weight}
                  onChange={(e) =>
                    updateOfferRow(row._key, "weight", e.target.value)
                  }
                  className="w-20"
                  placeholder="Wt"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOffer(row._key)}
                  className="h-9 w-9 shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : editingCampaign ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useGetAllCampaigns();
  const { data: trafficSources } = useGetAllTrafficSources();
  const { data: stats } = useGetCampaignStats();
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const trafficSourceMap = trafficSources
    ? Object.fromEntries(trafficSources.map((ts) => [ts.id, ts.name]))
    : {};

  const statsMap = stats
    ? Object.fromEntries(stats.map((s) => [s.campaignId, s]))
    : {};

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign.mutateAsync(id);
      toast.success("Campaign deleted");
      setDeletingId(null);
    } catch {
      toast.error("Failed to delete campaign");
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const newStatus =
      campaign.status === CampaignStatus.active
        ? CampaignStatus.paused
        : CampaignStatus.active;
    try {
      await updateCampaign.mutateAsync({
        id: campaign.id,
        name: campaign.name,
        trafficSourceId: campaign.trafficSourceId,
        offerIds: campaign.offerIds,
        status: newStatus,
        trackingDomain: campaign.trackingDomain,
      });
      toast.success(
        `Campaign ${newStatus === CampaignStatus.active ? "activated" : "paused"}`,
      );
    } catch {
      toast.error("Failed to update campaign status");
    }
  };

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
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
          <h2 className="font-display text-lg font-semibold">Campaigns</h2>
          <p className="text-sm text-muted-foreground">
            {campaigns?.length ?? 0} total campaigns
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
          New Campaign
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
                  Traffic Source
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">
                  Clicks
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">
                  CR%
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">
                  Revenue
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right pr-5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!campaigns || campaigns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">No campaigns yet</p>
                      <p className="text-xs">
                        Create your first campaign to get started
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => {
                  const s = statsMap[campaign.id];
                  return (
                    <TableRow
                      key={campaign.id}
                      className="border-border hover:bg-accent/20 transition-colors"
                    >
                      <TableCell className="pl-5 font-medium text-sm">
                        {campaign.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {trafficSourceMap[campaign.trafficSourceId] ?? "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {s ? Number(s.clicks).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-info">
                        {s
                          ? `${(Number(s.conversionRate) * 0.01).toFixed(2)}%`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-success">
                        {s ? `$${(Number(s.revenue) / 100).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleToggleStatus(campaign)}
                            title={
                              campaign.status === CampaignStatus.active
                                ? "Pause"
                                : "Activate"
                            }
                          >
                            {campaign.status === CampaignStatus.active ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(campaign)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-destructive"
                            onClick={() => setDeletingId(campaign.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Campaign Form */}
      {formOpen && (
        <CampaignForm
          open={formOpen}
          onClose={closeForm}
          editingCampaign={editing}
        />
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All associated data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteCampaign.isPending}
            >
              {deleteCampaign.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
