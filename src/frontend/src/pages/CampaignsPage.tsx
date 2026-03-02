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
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Copy,
  ExternalLink,
  Layers,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Campaign, Offer, Stream } from "../backend.d";
import { CampaignStatus, DomainType } from "../backend.d";
import {
  StreamState,
  useCreateCampaign,
  useCreateStream,
  useDeleteCampaign,
  useDeleteStream,
  useGetAllCampaigns,
  useGetAllDomains,
  useGetAllOffers,
  useGetAllTrafficSources,
  useGetCampaignStats,
  useGetStreamsByCampaign,
  useMigrateCampaignKeys,
  useUpdateCampaign,
  useUpdateStream,
} from "../hooks/useQueries";
import { getCreatorByEntityId } from "../utils/activityLog";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getStreamStateBadge(state: string) {
  if (state === StreamState.active) {
    return (
      <Badge className="bg-success/10 text-success border-success/20 border text-xs">
        Active
      </Badge>
    );
  }
  return (
    <Badge className="bg-warning/10 text-warning border-warning/20 border text-xs">
      Paused
    </Badge>
  );
}

function getTrackingLink(campaign: Campaign): string {
  const base = campaign.trackingDomain
    ? `https://${campaign.trackingDomain}`
    : window.location.origin;
  return `${base}/#/click/${campaign.campaignKey}`;
}

// ── Stream Form ───────────────────────────────────────────────────────────────

interface StreamFormProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  editingStream?: Stream;
  offers: Offer[];
  existingCount: number;
}

function StreamForm({
  open,
  onClose,
  campaignId,
  editingStream,
  offers,
  existingCount,
}: StreamFormProps) {
  const createStream = useCreateStream();
  const updateStream = useUpdateStream();

  const [name, setName] = useState(
    editingStream?.name ?? `Stream ${existingCount + 1}`,
  );
  const [offerId, setOfferId] = useState(editingStream?.offerId ?? "");
  const [weight, setWeight] = useState(
    editingStream ? Number(editingStream.weight) : 100,
  );
  const [state, setState] = useState<StreamState>(
    editingStream
      ? (editingStream.state as unknown as StreamState)
      : StreamState.active,
  );
  const [position, setPosition] = useState(
    editingStream ? Number(editingStream.position) : existingCount + 1,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerId) {
      toast.error("Please select an offer");
      return;
    }
    if (!name.trim()) {
      toast.error("Stream name is required");
      return;
    }
    try {
      if (editingStream) {
        await updateStream.mutateAsync({
          id: editingStream.id,
          campaignId,
          name: name.trim(),
          offerId,
          weight: BigInt(weight),
          state,
          position: BigInt(position),
        });
        toast.success("Stream updated");
      } else {
        await createStream.mutateAsync({
          name: name.trim(),
          campaignId,
          offerId,
          weight: BigInt(weight),
          state,
          position: BigInt(position),
        });
        toast.success("Stream created");
      }
      onClose();
    } catch (err) {
      toast.error(
        `Failed to save stream: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const isPending = createStream.isPending || updateStream.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-ocid="stream.dialog">
        <DialogHeader>
          <DialogTitle>
            {editingStream ? "Edit Stream" : "Add Stream"}
          </DialogTitle>
          <DialogDescription>
            A stream routes traffic from this campaign to an offer with a given
            weight.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stream-name">Stream Name *</Label>
            <Input
              id="stream-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Stream"
              data-ocid="stream.input"
            />
          </div>
          <div className="space-y-2">
            <Label>Offer *</Label>
            <Select value={offerId} onValueChange={setOfferId}>
              <SelectTrigger data-ocid="stream.select">
                <SelectValue placeholder="Select offer" />
              </SelectTrigger>
              <SelectContent>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stream-weight">Weight</Label>
              <Input
                id="stream-weight"
                type="number"
                min={1}
                value={weight}
                onChange={(e) =>
                  setWeight(Number.parseInt(e.target.value) || 1)
                }
                data-ocid="stream.input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stream-position">Position</Label>
              <Input
                id="stream-position"
                type="number"
                min={1}
                value={position}
                onChange={(e) =>
                  setPosition(Number.parseInt(e.target.value) || 1)
                }
                data-ocid="stream.input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Select
              value={state}
              onValueChange={(v) => setState(v as StreamState)}
            >
              <SelectTrigger data-ocid="stream.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={StreamState.active}>Active</SelectItem>
                <SelectItem value={StreamState.paused}>Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="stream.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              data-ocid="stream.submit_button"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingStream ? (
                "Update"
              ) : (
                "Add Stream"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Streams Panel ─────────────────────────────────────────────────────────────

interface StreamsPanelProps {
  campaign: Campaign;
  offers: Offer[];
  onClose: () => void;
}

function StreamsPanel({ campaign, offers, onClose }: StreamsPanelProps) {
  const { data: streams, isLoading } = useGetStreamsByCampaign(campaign.id);
  const deleteStream = useDeleteStream();
  const [streamFormOpen, setStreamFormOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | undefined>();
  const [deletingStreamId, setDeletingStreamId] = useState<string | null>(null);

  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o.name]));

  const handleDeleteStream = async (stream: Stream) => {
    try {
      await deleteStream.mutateAsync({
        id: stream.id,
        campaignId: campaign.id,
        name: stream.name,
      });
      toast.success("Stream deleted");
      setDeletingStreamId(null);
    } catch {
      toast.error("Failed to delete stream");
    }
  };

  const activeStreams =
    streams?.filter(
      (s) =>
        (s.state as unknown as StreamState) === StreamState.active && s.offerId,
    ) ?? [];

  const hasNoActiveStreams = !isLoading && activeStreams.length === 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-ocid="streams.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Streams — {campaign.name}
          </DialogTitle>
          <DialogDescription>
            Streams define where traffic is sent. Each stream points to an offer
            with a relative weight. Campaign key:{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
              {campaign.campaignKey}
            </code>
          </DialogDescription>
        </DialogHeader>

        {hasNoActiveStreams && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20 text-warning text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            No active streams — this campaign won't redirect traffic until you
            add at least one active stream with an offer.
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {streams?.length ?? 0} stream{streams?.length !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditingStream(undefined);
                setStreamFormOpen(true);
              }}
              data-ocid="streams.open_modal_button"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stream
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((k) => (
                <Skeleton key={k} className="h-12 w-full" />
              ))}
            </div>
          ) : !streams || streams.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 py-10 text-muted-foreground"
              data-ocid="streams.empty_state"
            >
              <Layers className="w-8 h-8 opacity-30" />
              <p className="text-sm font-medium">No streams yet</p>
              <p className="text-xs">
                Add a stream to define where traffic goes
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="pl-4 text-xs font-medium text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">
                      Offer
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      Weight
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">
                      State
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streams.map((stream, idx) => (
                    <TableRow
                      key={stream.id}
                      className="border-border hover:bg-accent/20"
                      data-ocid={`streams.item.${idx + 1}`}
                    >
                      <TableCell className="pl-4 font-medium text-sm">
                        {stream.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {offerMap[stream.offerId] ?? (
                          <span className="text-destructive text-xs">
                            Offer not found
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {Number(stream.weight)}
                      </TableCell>
                      <TableCell>
                        {getStreamStateBadge(stream.state as unknown as string)}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingStream(stream);
                              setStreamFormOpen(true);
                            }}
                            data-ocid={`streams.edit_button.${idx + 1}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-destructive"
                            onClick={() => setDeletingStreamId(stream.id)}
                            data-ocid={`streams.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="streams.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Stream form */}
      {streamFormOpen && (
        <StreamForm
          open={streamFormOpen}
          onClose={() => {
            setStreamFormOpen(false);
            setEditingStream(undefined);
          }}
          campaignId={campaign.id}
          editingStream={editingStream}
          offers={offers}
          existingCount={streams?.length ?? 0}
        />
      )}

      {/* Delete stream confirm */}
      <Dialog
        open={!!deletingStreamId}
        onOpenChange={() => setDeletingStreamId(null)}
      >
        <DialogContent className="max-w-sm" data-ocid="streams.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Stream</DialogTitle>
            <DialogDescription>
              This stream will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingStreamId(null)}
              data-ocid="streams.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const s = streams?.find((x) => x.id === deletingStreamId);
                if (s) handleDeleteStream(s);
              }}
              disabled={deleteStream.isPending}
              data-ocid="streams.delete.confirm_button"
            >
              {deleteStream.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// ── Campaign Form ─────────────────────────────────────────────────────────────

interface CampaignFormProps {
  open: boolean;
  onClose: () => void;
  editingCampaign?: Campaign;
  onCreated?: (campaign: Campaign) => void;
}

function CampaignForm({
  open,
  onClose,
  editingCampaign,
  onCreated,
}: CampaignFormProps) {
  const { data: trafficSources } = useGetAllTrafficSources();
  const { data: domains } = useGetAllDomains();
  const { data: allOffers } = useGetAllOffers();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const createStream = useCreateStream();

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
    editingCampaign?.trackingDomain || "__default__",
  );

  // Step 2 state (stream creation after campaign created)
  const [step, setStep] = useState<1 | 2>(1);
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);
  const [streamOfferId, setStreamOfferId] = useState("");
  const [streamName, setStreamName] = useState("Main Stream");
  const [streamWeight, setStreamWeight] = useState(100);

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

    try {
      if (editingCampaign) {
        await updateCampaign.mutateAsync({
          id: editingCampaign.id,
          name: name.trim(),
          trafficSourceId,
          status,
          trackingDomain:
            trackingDomain === "__default__" ? "" : trackingDomain.trim(),
        });
        toast.success("Campaign updated");
        onClose();
      } else {
        const created = await createCampaign.mutateAsync({
          name: name.trim(),
          trafficSourceId,
          status,
          trackingDomain:
            trackingDomain === "__default__" ? "" : trackingDomain.trim(),
        });
        if (created) {
          setCreatedCampaign(created);
          setStep(2);
        } else {
          toast.success("Campaign created");
          onClose();
        }
        return;
      }
    } catch (err) {
      toast.error(
        `Failed to save campaign: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleAddStream = async () => {
    if (!createdCampaign) return;
    if (!streamOfferId) {
      toast.error("Please select an offer");
      return;
    }
    try {
      await createStream.mutateAsync({
        name: streamName.trim() || "Main Stream",
        campaignId: createdCampaign.id,
        offerId: streamOfferId,
        weight: BigInt(streamWeight),
        state: StreamState.active,
        position: BigInt(1),
      });
      toast.success("Campaign and stream created successfully");
      if (onCreated) onCreated(createdCampaign);
      onClose();
    } catch (err) {
      toast.error(
        `Failed to create stream: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleSkipStream = () => {
    if (createdCampaign && onCreated) onCreated(createdCampaign);
    toast.success("Campaign created — add a stream later to route traffic");
    onClose();
  };

  const isPending = createCampaign.isPending || updateCampaign.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-ocid="campaign.dialog">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? "Edit Campaign" : "New Campaign"}
              </DialogTitle>
              <DialogDescription>
                {editingCampaign
                  ? "Update campaign settings"
                  : "Create a new tracking campaign. After creating, add a stream to route traffic to an offer."}
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
                  data-ocid="campaign.input"
                />
              </div>
              <div className="space-y-2">
                <Label>Traffic Source *</Label>
                <Select
                  value={trafficSourceId}
                  onValueChange={setTrafficSourceId}
                >
                  <SelectTrigger data-ocid="campaign.select">
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
                  <SelectTrigger data-ocid="campaign.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CampaignStatus.active}>
                      Active
                    </SelectItem>
                    <SelectItem value={CampaignStatus.paused}>
                      Paused
                    </SelectItem>
                    <SelectItem value={CampaignStatus.archived}>
                      Archived
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tracking Domain</Label>
                {campaignDomains.length > 0 ? (
                  <Select
                    value={trackingDomain}
                    onValueChange={setTrackingDomain}
                  >
                    <SelectTrigger data-ocid="campaign.select">
                      <SelectValue placeholder="Select campaign domain (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">
                        Default (app domain)
                      </SelectItem>
                      {campaignDomains.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                    No campaign domains configured — add one in the Domains
                    section
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-ocid="campaign.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  data-ocid="campaign.submit_button"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : editingCampaign ? (
                    "Update"
                  ) : (
                    "Create & Add Stream →"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Add Stream to "{createdCampaign?.name}"
              </DialogTitle>
              <DialogDescription>
                A stream routes traffic to an offer. Without a stream, visitors
                won't be redirected.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-warning/10 border border-warning/20 text-warning text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Without a stream, traffic won't be redirected to an offer
                </span>
              </div>

              <div className="space-y-2">
                <Label>Offer *</Label>
                <Select value={streamOfferId} onValueChange={setStreamOfferId}>
                  <SelectTrigger data-ocid="stream.select">
                    <SelectValue placeholder="Select offer to redirect to" />
                  </SelectTrigger>
                  <SelectContent>
                    {allOffers?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stream-name-inline">Stream Name</Label>
                <Input
                  id="stream-name-inline"
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                  placeholder="Main Stream"
                  data-ocid="stream.input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stream-weight-inline">Weight</Label>
                <Input
                  id="stream-weight-inline"
                  type="number"
                  min={1}
                  value={streamWeight}
                  onChange={(e) =>
                    setStreamWeight(Number.parseInt(e.target.value) || 1)
                  }
                  data-ocid="stream.input"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipStream}
                data-ocid="stream.cancel_button"
              >
                Skip for now
              </Button>
              <Button
                type="button"
                onClick={handleAddStream}
                disabled={createStream.isPending}
                data-ocid="stream.submit_button"
              >
                {createStream.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Stream"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Campaigns Page ────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useGetAllCampaigns();
  const { data: trafficSources } = useGetAllTrafficSources();
  const { data: stats } = useGetCampaignStats();
  const { data: offers } = useGetAllOffers();
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();
  const migrateCampaignKeys = useMigrateCampaignKeys();
  const queryClient = useQueryClient();

  // Auto-migrate old campaigns that still have "static_key" (run once on first load)
  useEffect(() => {
    if (!campaigns) return;
    const hasLegacy = campaigns.some((c) => c.campaignKey === "static_key");
    if (!hasLegacy) return;
    const { mutate } = migrateCampaignKeys;
    mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      },
    });
  }, [campaigns, migrateCampaignKeys, queryClient]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [streamsFor, setStreamsFor] = useState<Campaign | undefined>();

  const trafficSourceMap = trafficSources
    ? Object.fromEntries(trafficSources.map((ts) => [ts.id, ts.name]))
    : {};

  const statsMap = stats
    ? Object.fromEntries(stats.map((s) => [s.campaignId, s]))
    : {};

  const handleDelete = async (id: string) => {
    const campaign = campaigns?.find((c) => c.id === id);
    try {
      await deleteCampaign.mutateAsync({ id, name: campaign?.name ?? id });
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

  // Stream creation now happens inline in CampaignForm (step 2).
  // This handler is kept so callers can hook into post-creation if needed.
  const handleCampaignCreated = (_campaign: Campaign) => {
    // No-op: stream dialog is shown inside CampaignForm as step 2
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
          data-ocid="campaign.open_modal_button"
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
          <div className="overflow-x-auto">
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
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Campaign Key
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">
                    Clicks
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">
                    CR%
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Tracking Link
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
                {!campaigns || campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-16 text-muted-foreground"
                      data-ocid="campaigns.empty_state"
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
                  campaigns.map((campaign, idx) => {
                    const s = statsMap[campaign.id];
                    const link = getTrackingLink(campaign);
                    return (
                      <TableRow
                        key={campaign.id}
                        className="border-border hover:bg-accent/20 transition-colors"
                        data-ocid={`campaigns.item.${idx + 1}`}
                      >
                        <TableCell className="pl-5 font-medium text-sm">
                          {campaign.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {trafficSourceMap[campaign.trafficSourceId] ?? "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {campaign.campaignKey}
                          </code>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {s ? Number(s.clicks).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-info">
                          {s
                            ? `${(Number(s.conversionRate) * 0.01).toFixed(2)}%`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px]">
                          <div className="flex items-center gap-1">
                            <span
                              className="truncate text-xs text-muted-foreground font-mono max-w-[140px]"
                              title={link}
                            >
                              {link}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(link);
                                toast.success("Copied!");
                              }}
                              title="Copy link"
                              data-ocid={`campaigns.copy_button.${idx + 1}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => window.open(link, "_blank")}
                              title="Open link"
                              data-ocid={`campaigns.secondary_button.${idx + 1}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {getCreatorByEntityId(campaign.id) ?? (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setStreamsFor(campaign)}
                              title="Manage Streams"
                              data-ocid={`campaigns.streams_button.${idx + 1}`}
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </Button>
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
                              data-ocid={`campaigns.toggle.${idx + 1}`}
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
                              data-ocid={`campaigns.edit_button.${idx + 1}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-destructive"
                              onClick={() => setDeletingId(campaign.id)}
                              data-ocid={`campaigns.delete_button.${idx + 1}`}
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
          </div>
        )}
      </motion.div>

      {/* Campaign Form */}
      {formOpen && (
        <CampaignForm
          open={formOpen}
          onClose={closeForm}
          editingCampaign={editing}
          onCreated={!editing ? handleCampaignCreated : undefined}
        />
      )}

      {/* Streams Panel */}
      {streamsFor && (
        <StreamsPanel
          campaign={streamsFor}
          offers={offers ?? []}
          onClose={() => setStreamsFor(undefined)}
        />
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm" data-ocid="campaign.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All associated data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              data-ocid="campaign.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteCampaign.isPending}
              data-ocid="campaign.delete.confirm_button"
            >
              {deleteCampaign.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
