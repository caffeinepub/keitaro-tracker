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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GitBranch, Pencil, Plus, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Condition, Flow, OfferWeight, RoutingRule } from "../backend.d";
import {
  useCreateFlow,
  useDeleteFlow,
  useGetAllCampaigns,
  useGetAllFlows,
  useGetAllOffers,
  useUpdateFlow,
} from "../hooks/useQueries";

interface ConditionRow extends Condition {
  _key: number;
}

interface OfferWeightRow extends OfferWeight {
  _key: number;
}

interface RuleRow {
  _key: number;
  conditions: ConditionRow[];
  targetOffers: OfferWeightRow[];
}

function toRuleRows(rules: RoutingRule[]): RuleRow[] {
  return rules.map((rule, ri) => ({
    _key: ri,
    conditions: rule.conditions.map((c, ci) => ({ ...c, _key: ci })),
    targetOffers: rule.targetOffers.map((o, oi) => ({ ...o, _key: oi })),
  }));
}

interface FlowFormProps {
  open: boolean;
  onClose: () => void;
  editingFlow?: Flow;
}

function FlowForm({ open, onClose, editingFlow }: FlowFormProps) {
  const createFlow = useCreateFlow();
  const updateFlow = useUpdateFlow();
  const { data: campaigns } = useGetAllCampaigns();
  const { data: offers } = useGetAllOffers();

  const [name, setName] = useState(editingFlow?.name ?? "");
  const [campaignId, setCampaignId] = useState(editingFlow?.campaignId ?? "");
  const [rules, setRules] = useState<RuleRow[]>(
    editingFlow?.rules ? toRuleRows(editingFlow.rules) : [],
  );
  const [nextRuleKey, setNextRuleKey] = useState(
    editingFlow?.rules.length ?? 0,
  );

  const addRule = () => {
    setRules([
      ...rules,
      { _key: nextRuleKey, conditions: [], targetOffers: [] },
    ]);
    setNextRuleKey(nextRuleKey + 1);
  };

  const removeRule = (key: number) =>
    setRules(rules.filter((r) => r._key !== key));

  const addCondition = (ruleKey: number) => {
    setRules(
      rules.map((r) => {
        if (r._key !== ruleKey) return r;
        const nextKey = r.conditions.length;
        return {
          ...r,
          conditions: [
            ...r.conditions,
            { _key: nextKey, field: "", operator: "==", value: "" },
          ],
        };
      }),
    );
  };

  const removeCondition = (ruleKey: number, condKey: number) => {
    setRules(
      rules.map((r) =>
        r._key !== ruleKey
          ? r
          : {
              ...r,
              conditions: r.conditions.filter((c) => c._key !== condKey),
            },
      ),
    );
  };

  const updateCondition = (
    ruleKey: number,
    condKey: number,
    field: keyof Condition,
    val: string,
  ) => {
    setRules(
      rules.map((r) =>
        r._key !== ruleKey
          ? r
          : {
              ...r,
              conditions: r.conditions.map((c) =>
                c._key !== condKey ? c : { ...c, [field]: val },
              ),
            },
      ),
    );
  };

  const addTargetOffer = (ruleKey: number) => {
    setRules(
      rules.map((r) => {
        if (r._key !== ruleKey) return r;
        const nextKey = r.targetOffers.length;
        return {
          ...r,
          targetOffers: [
            ...r.targetOffers,
            { _key: nextKey, offerId: "", weight: BigInt(1) },
          ],
        };
      }),
    );
  };

  const removeTargetOffer = (ruleKey: number, offerKey: number) => {
    setRules(
      rules.map((r) =>
        r._key !== ruleKey
          ? r
          : {
              ...r,
              targetOffers: r.targetOffers.filter((o) => o._key !== offerKey),
            },
      ),
    );
  };

  const updateTargetOffer = (
    ruleKey: number,
    offerKey: number,
    field: "offerId" | "weight",
    val: string,
  ) => {
    setRules(
      rules.map((r) =>
        r._key !== ruleKey
          ? r
          : {
              ...r,
              targetOffers: r.targetOffers.map((o) =>
                o._key !== offerKey
                  ? o
                  : {
                      ...o,
                      [field]:
                        field === "weight"
                          ? BigInt(Number.parseInt(val) || 1)
                          : val,
                    },
              ),
            },
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Flow name is required");
      return;
    }
    if (!campaignId) {
      toast.error("Campaign is required");
      return;
    }

    const routingRules: RoutingRule[] = rules.map((r) => ({
      conditions: r.conditions.map(({ _key: _, ...c }) => c),
      targetOffers: r.targetOffers.map(({ _key: _, ...o }) => o),
    }));

    try {
      if (editingFlow) {
        await updateFlow.mutateAsync({
          id: editingFlow.id,
          name: name.trim(),
          campaignId,
          rules: routingRules,
        });
        toast.success("Flow updated");
      } else {
        await createFlow.mutateAsync({
          name: name.trim(),
          campaignId,
          rules: routingRules,
        });
        toast.success("Flow created");
      }
      onClose();
    } catch {
      toast.error("Failed to save flow");
    }
  };

  const isPending = createFlow.isPending || updateFlow.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingFlow ? "Edit Flow" : "New Flow"}</DialogTitle>
          <DialogDescription>
            Configure routing rules and offer targets
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Flow Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Flow name"
              />
            </div>
            <div className="space-y-2">
              <Label>Campaign *</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Routing Rules</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addRule}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Rule
              </Button>
            </div>
            {rules.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No routing rules. Traffic will use default routing.
              </p>
            )}
            {rules.map((rule, ruleIdx) => (
              <div
                key={rule._key}
                className="border border-border rounded-md p-3 space-y-3 bg-muted/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rule #{ruleIdx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeRule(rule._key)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Conditions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Conditions
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => addCondition(rule._key)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {rule.conditions.map((cond) => (
                    <div key={cond._key} className="flex gap-2 mb-1.5">
                      <Input
                        placeholder="Field (e.g. country)"
                        value={cond.field}
                        onChange={(e) =>
                          updateCondition(
                            rule._key,
                            cond._key,
                            "field",
                            e.target.value,
                          )
                        }
                        className="h-7 text-xs flex-1"
                      />
                      <Select
                        value={cond.operator}
                        onValueChange={(v) =>
                          updateCondition(rule._key, cond._key, "operator", v)
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "==",
                            "!=",
                            "contains",
                            "not_contains",
                            ">",
                            "<",
                          ].map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={cond.value}
                        onChange={(e) =>
                          updateCondition(
                            rule._key,
                            cond._key,
                            "value",
                            e.target.value,
                          )
                        }
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeCondition(rule._key, cond._key)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {rule.conditions.length === 0 && (
                    <p className="text-xs text-muted-foreground/50">
                      No conditions (matches all)
                    </p>
                  )}
                </div>

                <Separator className="bg-border" />

                {/* Target Offers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Target Offers
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => addTargetOffer(rule._key)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {rule.targetOffers.map((offer) => (
                    <div key={offer._key} className="flex gap-2 mb-1.5">
                      <Select
                        value={offer.offerId}
                        onValueChange={(v) =>
                          updateTargetOffer(rule._key, offer._key, "offerId", v)
                        }
                      >
                        <SelectTrigger className="flex-1 h-7 text-xs">
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
                        value={String(offer.weight)}
                        onChange={(e) =>
                          updateTargetOffer(
                            rule._key,
                            offer._key,
                            "weight",
                            e.target.value,
                          )
                        }
                        className="w-20 h-7 text-xs"
                        placeholder="Wt"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeTargetOffer(rule._key, offer._key)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {rule.targetOffers.length === 0 && (
                    <p className="text-xs text-muted-foreground/50">
                      No target offers
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : editingFlow ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FlowsPage() {
  const { data: flows, isLoading } = useGetAllFlows();
  const { data: campaigns } = useGetAllCampaigns();
  const deleteFlow = useDeleteFlow();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Flow | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const campaignMap = campaigns
    ? Object.fromEntries(campaigns.map((c) => [c.id, c.name]))
    : {};

  const handleDelete = async (id: string) => {
    const flow = flows?.find((f) => f.id === id);
    try {
      await deleteFlow.mutateAsync({ id, name: flow?.name ?? id });
      toast.success("Flow deleted");
      setDeletingId(null);
    } catch {
      toast.error("Failed to delete flow");
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
          <h2 className="font-display text-lg font-semibold">Flows</h2>
          <p className="text-sm text-muted-foreground">
            {flows?.length ?? 0} routing flows
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
          New Flow
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
                  Campaign
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-center">
                  Rules
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right pr-5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!flows || flows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <GitBranch className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">No flows yet</p>
                      <p className="text-xs">
                        Create routing flows for your campaigns
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                flows.map((flow) => (
                  <TableRow
                    key={flow.id}
                    className="border-border hover:bg-accent/20 transition-colors"
                  >
                    <TableCell className="pl-5 font-medium text-sm">
                      {flow.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaignMap[flow.campaignId] ??
                        flow.campaignId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {flow.rules.length} rules
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(flow);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={() => setDeletingId(flow.id)}
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
        <FlowForm open={formOpen} onClose={closeForm} editingFlow={editing} />
      )}

      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Flow</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteFlow.isPending}
            >
              {deleteFlow.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
