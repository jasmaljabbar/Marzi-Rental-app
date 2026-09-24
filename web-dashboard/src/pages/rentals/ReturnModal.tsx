import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { rentalsApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useBusyFlags } from "../../hooks/useBusyFlags";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { currency } from "../../utils/format";
import { toNumber } from "../../utils/validation";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { ImageUpload } from "../../components/ui/ImageUpload";
import { FormError } from "../../components/ui/FormError";
import { Skeleton } from "../../components/ui/Skeleton";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import type { PaymentMethod, Rental, ReturnDamageInput, ReturnInput } from "../../types/models";

interface ReturnModalProps {
  open: boolean;
  onClose: () => void;
  // One or more active rentals of the same customer.
  rentals: Rental[];
  onCompleted?: () => void;
}

interface DamageDraft {
  open: boolean;
  amount: string;
  quantity: string;
  remark: string;
  photos: string[];
}

const emptyDamage = (): DamageDraft => ({ open: false, amount: "", quantity: "1", remark: "", photos: [] });

// Receive a return for one or several rentals at once. The bill (days, rate,
// discount cap, tax, advance, refund) is computed by the server through
// POST /rentals/return/preview, so what staff see is exactly what gets saved.
export function ReturnModal({ open, onClose, rentals, onCompleted }: ReturnModalProps) {
  const { afterRentalChange } = useInvalidate();
  const [discount, setDiscount] = useState("");
  const [lateFee, setLateFee] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [dueDate, setDueDate] = useState("");
  const [damages, setDamages] = useState<Record<string, DamageDraft>>({});
  const uploads = useBusyFlags();

  const ids = useMemo(() => rentals.map((r) => r.id), [rentals]);
  const idsKey = ids.join(",");

  useEffect(() => {
    if (!open) return;
    setDiscount("");
    setLateFee("");
    setTaxRate("");
    setPaidNow("");
    setMethod("Cash");
    setDueDate("");
    setDamages({});
  }, [open, idsKey]);

  function buildInput(): ReturnInput {
    const damageList: ReturnDamageInput[] = Object.entries(damages)
      .filter(([, d]) => d.open && (toNumber(d.amount) > 0 || d.photos.length > 0 || toNumber(d.quantity) > 0))
      .map(([rentalId, d]) => ({
        rental_id: rentalId,
        amount: toNumber(d.amount),
        damaged_quantity: Math.max(Math.floor(toNumber(d.quantity)), 0),
        photos: d.photos,
        remark: d.remark || undefined,
      }));
    return {
      rental_ids: ids,
      discount_amount: toNumber(discount),
      late_fee_amount: toNumber(lateFee),
      tax_rate_percent: taxRate === "" ? undefined : toNumber(taxRate),
      amount_paid: toNumber(paidNow),
      damages: damageList,
      due_date: dueDate || null,
      payment_method: method,
    };
  }

  // Photos don't change the bill, so they're left out of the preview key.
  const previewInput = useDebouncedValue(
    JSON.stringify({ ...buildInput(), damages: buildInput().damages?.map(({ photos: _photos, remark: _remark, ...rest }) => rest), payment_method: undefined }),
    300
  );
  const preview = useQuery({
    queryKey: ["rental-return-preview", previewInput],
    queryFn: () => rentalsApi.previewReturn(JSON.parse(previewInput) as ReturnInput),
    enabled: open && ids.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: () => rentalsApi.completeReturn(buildInput()),
    onSuccess: ({ summary }) => {
      if (summary.totals.discount_capped) {
        toast.warning(`Discount limited to the shop's ${summary.totals.discount_cap_percent}% cap.`);
      }
      const refund = summary.totals.refund_amount;
      toast.success(refund > 0 ? `Returned. Give back ${currency(refund)} of the advance.` : "Return completed.");
      afterRentalChange();
      onCompleted?.();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const totals = preview.data?.totals;
  const linesById = new Map((preview.data?.lines ?? []).map((l) => [l.rental_id, l]));
  const customerName = rentals[0]?.customer?.name ?? "Customer";

  function updateDamage(rentalId: string, patch: Partial<DamageDraft>) {
    setDamages((prev) => ({ ...prev, [rentalId]: { ...(prev[rentalId] ?? emptyDamage()), ...patch } }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rentals.length > 1 ? `Return ${rentals.length} items` : "Receive return"}
      description={customerName}
      size="lg"
    >
      <div className="space-y-4 text-sm">
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {rentals.map((r) => {
            const line = linesById.get(r.id);
            const damage = damages[r.id] ?? emptyDamage();
            return (
              <li key={r.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {r.equipment?.name ?? "Item"} × {r.quantity}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {line ? `${line.days} day${line.days === 1 ? "" : "s"} × ${currency(line.daily_rate)}` : "…"}
                      {r.advance_amount > 0 && ` · advance ${currency(r.advance_amount)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{line ? currency(line.total_amount) : "…"}</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline dark:text-amber-400"
                      onClick={() => updateDamage(r.id, { open: !damage.open })}
                      aria-expanded={damage.open}
                    >
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Report damage
                      {damage.open ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                {damage.open && (
                  <div className="mt-3 grid gap-3 rounded-md bg-amber-50/60 p-3 dark:bg-amber-500/5 sm:grid-cols-2">
                    <Input label="Damage charge" type="number" inputMode="decimal" min={0} step="0.01" value={damage.amount} onChange={(e) => updateDamage(r.id, { amount: e.target.value })} />
                    <Input
                      label="Units damaged"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={r.quantity}
                      hint="These units go to repair and can't be rented."
                      value={damage.quantity}
                      onChange={(e) => updateDamage(r.id, { quantity: e.target.value })}
                    />
                    <div className="sm:col-span-2">
                      <Textarea label="What's damaged?" rows={2} value={damage.remark} onChange={(e) => updateDamage(r.id, { remark: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <ImageUpload
                        label="Condition photos"
                        kind="damage"
                        value={damage.photos}
                        onChange={(photos) => updateDamage(r.id, { photos })}
                        max={4}
                        onBusyChange={(busy) => uploads.setBusy(r.id, busy)}
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Discount" type="number" inputMode="decimal" min={0} step="0.01" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          <Input label="Late fee" type="number" inputMode="decimal" min={0} step="0.01" placeholder="0" value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
          <Input
            label="Tax %"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.01"
            placeholder={preview.data?.lines[0] ? String(preview.data.lines[0].tax_rate_percent) : "Default"}
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60" aria-live="polite">
          {preview.isError ? (
            <FormError message={apiErrorMessage(preview.error).detail} />
          ) : !totals ? (
            <Skeleton lines={4} />
          ) : (
            <dl className="space-y-1">
              <Row label="Rent" value={currency(totals.gross_amount)} />
              {totals.discount_amount > 0 && (
                <Row
                  label={totals.discount_capped ? `Discount (capped at ${totals.discount_cap_percent}%)` : "Discount"}
                  value={`− ${currency(totals.discount_amount)}`}
                  tone={totals.discount_capped ? "warn" : undefined}
                />
              )}
              {totals.late_fee_amount > 0 && <Row label="Late fee" value={`+ ${currency(totals.late_fee_amount)}`} />}
              {totals.damage_amount > 0 && <Row label="Damage" value={`+ ${currency(totals.damage_amount)}`} />}
              {totals.tax_amount > 0 && <Row label="Tax" value={`+ ${currency(totals.tax_amount)}`} />}
              <Row label="Total" value={currency(totals.total_amount)} strong />
              {totals.advance_amount > 0 && <Row label="Advance already paid" value={`− ${currency(totals.advance_amount)}`} />}
              {totals.refund_amount > 0 && <Row label="Refund to customer" value={currency(totals.refund_amount)} tone="good" strong />}
            </dl>
          )}
        </div>

        {(!totals || totals.refund_amount === 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Amount received now"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0"
              hint={totals ? `Up to ${currency(totals.total_amount - totals.advance_amount > 0 ? totals.total_amount - totals.advance_amount : 0)}` : undefined}
              value={paidNow}
              onChange={(e) => setPaidNow(e.target.value)}
            />
            <PaymentMethodSelect value={method} onChange={setMethod} />
          </div>
        )}

        {totals && (
          <div
            className={`flex justify-between rounded-md px-3 py-2 font-semibold ${
              totals.amount_due > 0 ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
            }`}
          >
            <span>{totals.amount_due > 0 ? "Still due" : "Settled"}</span>
            <span>{currency(totals.amount_due)}</span>
          </div>
        )}

        {totals && totals.amount_due > 0 && <Input label="Promise to pay by (optional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!totals || preview.isError || uploads.anyBusy}>
            Complete return
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "warn" | "good" }) {
  const color = tone === "warn" ? "text-amber-700 dark:text-amber-400" : tone === "good" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200";
  return (
    <div className={`flex justify-between ${strong ? "border-t border-slate-200 pt-1 font-semibold dark:border-slate-700" : ""}`}>
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={color}>{value}</dd>
    </div>
  );
}
