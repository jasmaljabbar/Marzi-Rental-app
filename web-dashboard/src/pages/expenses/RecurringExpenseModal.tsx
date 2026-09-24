import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { expensesApi, equipmentApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { EXPENSE_CATEGORY_PRESETS } from "./ExpenseFormModal";
import type { RecurringExpenseTemplate } from "../../types/models";

interface RecurringExpenseModalProps {
  open: boolean;
  onClose: () => void;
  template?: RecurringExpenseTemplate | null;
}

export function RecurringExpenseModal({ open, onClose, template }: RecurringExpenseModalProps) {
  const isEdit = Boolean(template);
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [equipmentId, setEquipmentId] = useState("");
  const [remark, setRemark] = useState("");

  const { data: equipmentResult } = useQuery({
    queryKey: ["equipment", "for-select"],
    queryFn: () => equipmentApi.list({ page: 1, page_size: 500 }),
    enabled: open,
  });
  const equipmentItems = (equipmentResult?.items ?? []).filter((e) => !e.is_archived);

  useEffect(() => {
    if (!open) return;
    setCategory(template?.category ?? "");
    setAmount(template ? String(template.amount) : "");
    setDayOfMonth(template ? String(template.day_of_month) : "1");
    setEquipmentId(template?.equipment_id ?? "");
    setRemark(template?.remark ?? "");
  }, [open, template]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        category,
        amount: Number(amount) || 0,
        day_of_month: Math.min(Math.max(Number(dayOfMonth) || 1, 1), 28),
        equipment_id: equipmentId || null,
        remark: remark || null,
      };
      return isEdit ? expensesApi.updateRecurring(template!.id, payload) : expensesApi.createRecurring(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Recurring expense updated." : "Recurring expense scheduled.");
      queryClient.invalidateQueries({ queryKey: ["expenses", "recurring"] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category.trim()) return toast.error("Pick or enter a category.");
    mutation.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit recurring expense" : "New recurring expense"} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} required autoFocus />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCategory(preset)}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <Input
            label="Day of month due"
            type="number"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            required
          />
        </div>

        <Select label="Equipment (optional)" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
          <option value="">Not linked to a specific item</option>
          {equipmentItems.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name}
            </option>
          ))}
        </Select>

        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />

        <p className="text-xs text-slate-400">
          Logged automatically the first time someone opens this page on or after day {dayOfMonth || 1} each month — no separate reminder is sent.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? "Save changes" : "Schedule expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
