import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { platformApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { currency } from "../../utils/format";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PlanForm } from "./PlanForm";
import type { Plan } from "../../types/models";

export function PlansPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const { data: plans = [], isLoading } = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.listPlans });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => platformApi.deletePlan(id),
    onSuccess: () => {
      toast.success("Plan deleted.");
      queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err).detail);
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingPlan(null);
    setFormOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Plans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Define pricing tiers, usage limits, and feature toggles.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New plan
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Trial</th>
              <th className="px-4 py-2 font-medium">Visibility</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && plans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No plans yet. Create one to get started.
                </td>
              </tr>
            )}
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{plan.name}</p>
                  <p className="text-xs text-slate-400">{plan.key}</p>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {currency(plan.price)} / {plan.billing_cycle === "yearly" ? "yr" : "mo"}
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{plan.trial_days ?? "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1.5">
                    <Badge tone={plan.is_public ? "emerald" : "neutral"}>{plan.is_public ? "Public" : "Hidden"}</Badge>
                    <Badge tone={plan.is_active ? "indigo" : "red"}>{plan.is_active ? "Active" : "Retired"}</Badge>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(plan)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlanForm open={formOpen} onClose={() => setFormOpen(false)} plan={editingPlan} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete plan"
        description={`Delete "${deleteTarget?.name}"? Accounts still on this plan will block the delete — deactivate it instead if it has subscribers.`}
        confirmLabel="Delete plan"
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
