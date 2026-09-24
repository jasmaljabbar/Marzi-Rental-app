import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { expensesApi, equipmentApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useBusyFlags } from "../../hooks/useBusyFlags";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { ImageUpload } from "../../components/ui/ImageUpload";
import type { Expense } from "../../types/models";

export const EXPENSE_CATEGORY_PRESETS = ["Salary", "Equipment Purchase", "Stock Purchase", "Repair Cost", "Transport", "Office", "Maintenance", "Other"];

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
}

export function ExpenseFormModal({ open, onClose, expense }: ExpenseFormModalProps) {
  const isEdit = Boolean(expense);
  const queryClient = useQueryClient();
  const { afterExpenseChange } = useInvalidate();

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string[]>([]);
  const uploads = useBusyFlags();

  const { data: equipmentResult } = useQuery({
    queryKey: ["equipment", "for-select"],
    queryFn: () => equipmentApi.list({ page: 1, page_size: 500 }),
    enabled: open,
  });
  const equipmentItems = (equipmentResult?.items ?? []).filter((e) => !e.is_archived);

  useEffect(() => {
    if (!open) return;
    setCategory(expense?.category ?? "");
    setAmount(expense ? String(expense.amount) : "");
    setRemark(expense?.remark ?? "");
    setEquipmentId(expense?.equipment_id ?? "");
    setReceiptUrl(expense?.receipt_url ? [expense.receipt_url] : []);
  }, [open, expense]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        category,
        amount: Number(amount) || 0,
        remark: remark || null,
        equipment_id: equipmentId || null,
        receipt_url: receiptUrl[0] ?? null,
      };
      return isEdit ? expensesApi.update(expense!.id, payload) : expensesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Expense updated." : "Expense recorded.");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      afterExpenseChange();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category.trim()) return toast.error("Pick or enter a category.");
    if (uploads.anyBusy) return toast.error("Wait for the photos to finish uploading, or remove the ones that failed.");
    mutation.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit expense" : "Add expense"} size="sm">
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
        <Input label="Amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />

        <Select label="Equipment (optional)" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
          <option value="">Not linked to a specific item</option>
          {equipmentItems.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name}
            </option>
          ))}
        </Select>
        {equipmentId && (
          <p className="-mt-2 text-xs text-slate-400">Counted against this item's net profit in Reports.</p>
        )}

        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />

        <ImageUpload label="Receipt photo" kind="receipt" value={receiptUrl} onChange={setReceiptUrl} max={1} onBusyChange={(busy) => uploads.setBusy("receipt", busy)} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending} disabled={uploads.anyBusy}>
            {isEdit ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
