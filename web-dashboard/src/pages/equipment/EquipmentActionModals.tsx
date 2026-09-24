import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { equipmentApi, customersApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { currency } from "../../utils/format";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import type { Equipment } from "../../types/models";

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  onDone?: () => void;
}

function useCommonInvalidate() {
  const queryClient = useQueryClient();
  const { afterEquipmentStockChange } = useInvalidate();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["equipment"] });
    afterEquipmentStockChange();
  };
}

export function AddStockModal({ open, onClose, equipment, onDone }: BaseModalProps) {
  const invalidate = useCommonInvalidate();
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setQty("1");
      setUnitPrice("0");
      setNote("");
    }
  }, [open]);

  const total = (Number(qty) || 0) * (Number(unitPrice) || 0);

  const mutation = useMutation({
    mutationFn: () => equipmentApi.addStock(equipment!.id, Number(qty) || 0, Number(unitPrice) || 0, note || undefined),
    onSuccess: () => {
      toast.success("Stock added.");
      invalidate();
      onDone?.();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (!equipment) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Add stock — ${equipment.name}`} size="sm">
      <div className="space-y-3">
        <Input label="Quantity" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        <Input label="Unit price (optional)" type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        {total > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This logs an expense of <strong>{currency(total)}</strong> (Stock Purchase).
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Add stock
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function MarkDamagedModal({ open, onClose, equipment, onDone }: BaseModalProps) {
  const invalidate = useCommonInvalidate();
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (open) setRemark("");
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => equipmentApi.maintenance(equipment!.id, "Damage", { remark: remark || undefined }),
    onSuccess: () => {
      toast.success("Marked as damaged.");
      invalidate();
      onDone?.();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (!equipment) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Mark damaged — ${equipment.name}`} size="sm">
      <div className="space-y-3">
        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} autoFocus />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Mark 1 unit damaged
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function RepairModal({ open, onClose, equipment, onDone }: BaseModalProps) {
  const invalidate = useCommonInvalidate();
  const [remark, setRemark] = useState("");
  const [cost, setCost] = useState("0");

  useEffect(() => {
    if (open) {
      setRemark("");
      setCost("0");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => equipmentApi.maintenance(equipment!.id, "Repair", { remark: remark || undefined, cost: Number(cost) || 0 }),
    onSuccess: () => {
      toast.success("Repair logged.");
      invalidate();
      onDone?.();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (!equipment) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Repair — ${equipment.name}`} size="sm">
      <div className="space-y-3">
        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} autoFocus />
        <Input label="Repair cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Log repair
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ScrapModal({ open, onClose, equipment, onDone }: BaseModalProps) {
  const invalidate = useCommonInvalidate();
  const [qty, setQty] = useState("1");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (open) {
      setQty("1");
      setRemark("");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => equipmentApi.scrap(equipment!.id, Number(qty) || 0, remark || undefined),
    onSuccess: () => {
      toast.success("Marked as scrap.");
      invalidate();
      onDone?.();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (!equipment) return null;
  const remaining = Math.max(equipment.stock_count - (Number(qty) || 0), 0);

  return (
    <Modal open={open} onClose={onClose} title={`Mark as scrap — ${equipment.name}`} size="sm">
      <div className="space-y-3">
        <Input label="Quantity" type="number" min={1} max={equipment.stock_count} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        <p className="text-xs text-slate-400">Stock after: {remaining}</p>
        <Textarea label="Reason" value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Confirm scrap
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function SellModal({ open, onClose, equipment, onDone }: BaseModalProps) {
  const queryClient = useQueryClient();
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState("0");
  const [remark, setRemark] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const debouncedSearch = useDebouncedValue(customerSearch);

  useEffect(() => {
    if (open) {
      setQty("1");
      setPrice(equipment ? String(equipment.rent_per_day * 10) : "");
      setPaid("0");
      setRemark("");
      setCustomerSearch("");
      setCustomerId("");
    }
  }, [open, equipment]);

  const { data: customersResult } = useQuery({
    queryKey: ["customers", "for-sell", debouncedSearch],
    queryFn: () => customersApi.list({ search: debouncedSearch || undefined, page: 1, page_size: 20 }),
    enabled: open,
  });
  const customers = customersResult?.items ?? [];

  const total = (Number(qty) || 0) * (Number(price) || 0);
  const due = Math.max(total - (Number(paid) || 0), 0);

  const mutation = useMutation({
    mutationFn: () =>
      equipmentApi.sell(equipment!.id, {
        customer_id: customerId,
        quantity: Number(qty) || 0,
        selling_price: Number(price) || 0,
        amount_paid: Number(paid) || 0,
        remark: remark || undefined,
      }),
    onSuccess: () => {
      toast.success("Sale recorded.");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-sales"] });
      onDone?.();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (!equipment) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Sell — ${equipment.name}`} size="sm">
      <div className="space-y-3">
        <div>
          <Input label="Find customer (name or phone)" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
          {customerSearch && (
            <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCustomerId(c.id);
                    setCustomerSearch(c.name);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {c.name} — {c.phone}
                </button>
              ))}
              {customers.length === 0 && <p className="px-3 py-1.5 text-sm text-slate-400">No match</p>}
            </div>
          )}
        </div>
        <Input label="Quantity" type="number" min={1} max={equipment.stock_count} value={qty} onChange={(e) => setQty(e.target.value)} />
        <Input label="Selling price / unit" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Input label="Amount paid now" type="number" min={0} step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} />
        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />

        <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Total {currency(total)}</span>
          <span className={due > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "font-semibold text-emerald-600"}>
            Pending {currency(due)}
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!customerId}>
            Confirm sale
          </Button>
        </div>
      </div>
    </Modal>
  );
}
