import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Globe, Pencil, Plus, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Parameter, TrafficSource } from "../backend.d";
import { CostModel, ParameterType } from "../backend.d";
import {
  useCreateTrafficSource,
  useDeleteTrafficSource,
  useGetAllTrafficSources,
  useUpdateTrafficSource,
} from "../hooks/useQueries";

function getCostModelBadge(model: CostModel) {
  const colors: Record<CostModel, string> = {
    [CostModel.cpc]: "bg-info/10 text-info border-info/20 border",
    [CostModel.cpm]: "bg-warning/10 text-warning border-warning/20 border",
    [CostModel.cpa]: "bg-success/10 text-success border-success/20 border",
  };
  return (
    <Badge className={`${colors[model]} text-xs uppercase`}>{model}</Badge>
  );
}

interface ParameterRow extends Parameter {
  _key: number;
}

interface TSFormProps {
  open: boolean;
  onClose: () => void;
  editingTS?: TrafficSource;
}

function TSForm({ open, onClose, editingTS }: TSFormProps) {
  const createTS = useCreateTrafficSource();
  const updateTS = useUpdateTrafficSource();

  const [name, setName] = useState(editingTS?.name ?? "");
  const [postbackUrl, setPostbackUrl] = useState(editingTS?.postbackUrl ?? "");
  const [costModel, setCostModel] = useState<CostModel>(
    editingTS?.costModel ?? CostModel.cpc,
  );
  const [params, setParams] = useState<ParameterRow[]>(
    editingTS?.parameters.map((p, i) => ({ ...p, _key: i })) ?? [],
  );
  const [nextKey, setNextKey] = useState(editingTS?.parameters.length ?? 0);

  const addParam = () => {
    setParams([
      ...params,
      {
        _key: nextKey,
        name: "",
        type: ParameterType.text,
        description: "",
        required: false,
      },
    ]);
    setNextKey(nextKey + 1);
  };

  const removeParam = (key: number) => {
    setParams(params.filter((p) => p._key !== key));
  };

  const updateParam = (
    key: number,
    field: keyof Parameter,
    value: string | boolean,
  ) => {
    setParams(
      params.map((p) => (p._key === key ? { ...p, [field]: value } : p)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const parameters: Parameter[] = params.map(({ _key: _, ...rest }) => rest);

    try {
      if (editingTS) {
        await updateTS.mutateAsync({
          id: editingTS.id,
          name: name.trim(),
          postbackUrl: postbackUrl.trim(),
          costModel,
          parameters,
        });
        toast.success("Traffic source updated");
      } else {
        await createTS.mutateAsync({
          name: name.trim(),
          postbackUrl: postbackUrl.trim(),
          costModel,
          parameters,
        });
        toast.success("Traffic source created");
      }
      onClose();
    } catch {
      toast.error("Failed to save traffic source");
    }
  };

  const isPending = createTS.isPending || updateTS.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTS ? "Edit Traffic Source" : "New Traffic Source"}
          </DialogTitle>
          <DialogDescription>
            Configure your traffic source settings and parameters
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google Ads"
            />
          </div>
          <div className="space-y-2">
            <Label>Postback URL</Label>
            <Input
              value={postbackUrl}
              onChange={(e) => setPostbackUrl(e.target.value)}
              placeholder="https://tracker.example.com/postback?clickid={click_id}&payout={payout}"
            />
          </div>
          <div className="space-y-2">
            <Label>Cost Model</Label>
            <Select
              value={costModel}
              onValueChange={(v) => setCostModel(v as CostModel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CostModel.cpc}>
                  CPC — Cost per Click
                </SelectItem>
                <SelectItem value={CostModel.cpm}>
                  CPM — Cost per 1000 Impressions
                </SelectItem>
                <SelectItem value={CostModel.cpa}>
                  CPA — Cost per Action
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Parameters</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addParam}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Parameter
              </Button>
            </div>
            {params.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No custom parameters added.
              </p>
            )}
            {params.map((param) => (
              <div
                key={param._key}
                className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/30 rounded-md border border-border"
              >
                <div className="col-span-4">
                  <Input
                    placeholder="Name"
                    value={param.name}
                    onChange={(e) =>
                      updateParam(param._key, "name", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <Select
                    value={param.type}
                    onValueChange={(v) => updateParam(param._key, "type", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ParameterType.text}>Text</SelectItem>
                      <SelectItem value={ParameterType.integer}>
                        Integer
                      </SelectItem>
                      <SelectItem value={ParameterType.float_}>
                        Float
                      </SelectItem>
                      <SelectItem value={ParameterType.boolean_}>
                        Boolean
                      </SelectItem>
                      <SelectItem value={ParameterType.currency}>
                        Currency
                      </SelectItem>
                      <SelectItem value={ParameterType.percentage}>
                        Percentage
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input
                    placeholder="Description"
                    value={param.description}
                    onChange={(e) =>
                      updateParam(param._key, "description", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center pt-1.5">
                  <Checkbox
                    checked={param.required}
                    onCheckedChange={(v) =>
                      updateParam(param._key, "required", !!v)
                    }
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeParam(param._key)}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
            {params.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Columns: Name, Type, Description, Required
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : editingTS ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TrafficSourcesPage() {
  const { data: trafficSources, isLoading } = useGetAllTrafficSources();
  const deleteTS = useDeleteTrafficSource();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrafficSource | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteTS.mutateAsync(id);
      toast.success("Traffic source deleted");
      setDeletingId(null);
    } catch {
      toast.error("Failed to delete traffic source");
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
          <h2 className="font-display text-lg font-semibold">
            Traffic Sources
          </h2>
          <p className="text-sm text-muted-foreground">
            {trafficSources?.length ?? 0} sources configured
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
          New Source
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
                  Cost Model
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Postback URL
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-center">
                  Params
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right pr-5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!trafficSources || trafficSources.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Globe className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">
                        No traffic sources yet
                      </p>
                      <p className="text-xs">Add your first traffic source</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                trafficSources.map((ts) => (
                  <TableRow
                    key={ts.id}
                    className="border-border hover:bg-accent/20 transition-colors"
                  >
                    <TableCell className="pl-5 font-medium text-sm">
                      {ts.name}
                    </TableCell>
                    <TableCell>{getCostModelBadge(ts.costModel)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">
                      {ts.postbackUrl ? (
                        <span className="truncate block font-mono text-xs">
                          {ts.postbackUrl}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {ts.parameters.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(ts);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={() => setDeletingId(ts.id)}
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
        <TSForm open={formOpen} onClose={closeForm} editingTS={editing} />
      )}

      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Traffic Source</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteTS.isPending}
            >
              {deleteTS.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
