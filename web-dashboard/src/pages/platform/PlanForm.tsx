import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { platformApi, catalogApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { Plan } from "../../types/models";

interface PlanFormProps {
  open: boolean;
  onClose: () => void;
  plan: Plan | null; // null = creating a new plan
}

// Renders limit/feature fields dynamically from GET /catalog rather than a
// fixed field list — adding a new limit/feature key to the backend's
// config/planCatalog.js makes it appear here with no change to this file.
export function PlanForm({ open, onClose, plan }: PlanFormProps) {
  const queryClient = useQueryClient();
  const { data: catalog } = useQuery({ queryKey: ["catalog"], queryFn: catalogApi.get, staleTime: Infinity });

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [currency, setCurrency] = useState("USD");
  const [trialDays, setTrialDays] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setKey(plan?.key ?? "");
    setName(plan?.name ?? "");
    setDescription(plan?.description ?? "");
    setPrice(String(plan?.price ?? 0));
    setBillingCycle(plan?.billing_cycle ?? "monthly");
    setCurrency(plan?.currency ?? "USD");
    setTrialDays(plan?.trial_days != null ? String(plan.trial_days) : "");
    setIsPublic(plan?.is_public ?? true);
    setIsActive(plan?.is_active ?? true);
    setSortOrder(String(plan?.sort_order ?? 0));

    const limitEntries: Record<string, string> = {};
    for (const def of catalog?.limits ?? []) {
      const value = plan?.limits[def.key];
      limitEntries[def.key] = value !== undefined ? String(value) : String(def.default);
    }
    setLimits(limitEntries);

    const featureEntries: Record<string, boolean> = {};
    for (const def of catalog?.features ?? []) {
      featureEntries[def.key] = plan?.features[def.key] ?? def.default;
    }
    setFeatures(featureEntries);
  }, [open, plan, catalog]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        key: key.trim().toLowerCase(),
        name: name.trim(),
        description,
        price: Number(price) || 0,
        billing_cycle: billingCycle,
        currency,
        trial_days: trialDays === "" ? null : Number(trialDays),
        is_public: isPublic,
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
        limits: Object.fromEntries(Object.entries(limits).map(([k, v]) => [k, Number(v)])),
        features,
      };
      return plan ? platformApi.updatePlan(plan.id, payload) : platformApi.createPlan(payload);
    },
    onSuccess: () => {
      toast.success(plan ? "Plan updated." : "Plan created.");
      invalidate();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  return (
    <Modal open={open} onClose={onClose} title={plan ? `Edit plan — ${plan.name}` : "New plan"} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Key" value={key} onChange={(e) => setKey(e.target.value)} disabled={Boolean(plan)} placeholder="e.g. professional" />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Professional" />
        </div>
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Select label="Billing cycle" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as "monthly" | "yearly")}>
            {(catalog?.billing_cycles ?? ["monthly", "yearly"]).map((cycle) => (
              <option key={cycle} value={cycle}>
                {cycle}
              </option>
            ))}
          </Select>
          <Input label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          <Input
            label="Trial days"
            type="number"
            min={0}
            placeholder="global default"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Public (shown on pricing page)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (assignable to accounts)
          </label>
          <Input
            label="Sort order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-24"
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Usage limits</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(catalog?.limits ?? []).map((def) => {
              const unlimited = limits[def.key] === "-1";
              return (
                <div key={def.key} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{def.label}</label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={unlimited}
                        onChange={(e) => setLimits((prev) => ({ ...prev, [def.key]: e.target.checked ? "-1" : String(def.default) }))}
                      />
                      Unlimited
                    </label>
                  </div>
                  <input
                    type="number"
                    min={0}
                    disabled={unlimited}
                    value={unlimited ? "" : limits[def.key] ?? ""}
                    onChange={(e) => setLimits((prev) => ({ ...prev, [def.key]: e.target.value }))}
                    placeholder={def.unit}
                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
                  />
                  <p className="mt-1 text-xs text-slate-400">{def.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Features</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(catalog?.features ?? []).map((def) => (
              <label
                key={def.key}
                className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={features[def.key] ?? def.default}
                  onChange={(e) => setFeatures((prev) => ({ ...prev, [def.key]: e.target.checked }))}
                />
                <span>
                  <span className="block font-medium text-slate-700 dark:text-slate-300">{def.label}</span>
                  <span className="block text-xs text-slate-400">{def.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} disabled={!key.trim() || !name.trim()}>
            {plan ? "Save changes" : "Create plan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
