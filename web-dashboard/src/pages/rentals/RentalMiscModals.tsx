import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { rentalsApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { usePermission } from "../../hooks/usePermission";
import { currency } from "../../utils/format";
import { toNumber } from "../../utils/validation";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import type { PaymentMethod, Rental } from "../../types/models";

interface RentalModalProps {
  open: boolean;
  onClose: () => void;
  rental: Rental | null;
}

export function EditActiveRentalModal({ open, onClose, rental }: RentalModalProps) {
  const { afterRentalChange } = useInvalidate();
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (open && rental) {
      setExpectedReturnDate(rental.expected_return_date?.slice(0, 10) ?? "");
      setAdvanceAmount(String(rental.advance_amount || 0));
      setMethod("Cash");
      setRemark(rental.remark ?? "");
    }
  }, [open, rental]);

  const advanceChanged = rental ? toNumber(advanceAmount) !== rental.advance_amount : false;

  const mutation = useMutation({
    mutationFn: () =>
      rentalsApi.update(rental!.id, {
        expected_return_date: expectedReturnDate || null,
        advance_amount: toNumber(advanceAmount),
        remark: remark || null,
        payment_method: method,
      }),
    onSuccess: () => {
      toast.success("Rental updated.");
      afterRentalChange();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (!rental) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit active rental" description={`${rental.equipment?.name ?? "Item"} × ${rental.quantity}`} size="sm">
      <div className="space-y-3">
        <Input label="Expected return date" type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
        <Input
          label="Advance received"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          hint="Changing this records the extra payment or refund."
          value={advanceAmount}
          onChange={(e) => setAdvanceAmount(e.target.value)}
        />
        {advanceChanged && <PaymentMethodSelect value={method} onChange={setMethod} label={toNumber(advanceAmount) > rental.advance_amount ? "Paid by" : "Refunded by"} />}
        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AddPaymentModal({ open, onClose, rental }: RentalModalProps) {
  const { afterRentalChange } = useInvalidate();
  const canWriteOff = usePermission("catalog.manage");
  const [amount, setAmount] = useState("0");
  const [writeOff, setWriteOff] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (open && rental) {
      setAmount(String(rental.amount_due || 0));
      setWriteOff("");
      setMethod("Cash");
      setDueDate(rental.due_date?.slice(0, 10) ?? "");
    }
  }, [open, rental]);

  const remaining = rental ? Math.max(rental.amount_due - toNumber(writeOff) - toNumber(amount), 0) : 0;

  const mutation = useMutation({
    mutationFn: () =>
      rentalsApi.addPayment(rental!.id, {
        amount_paid: toNumber(amount),
        discount_amount: toNumber(writeOff),
        due_date: remaining > 0 && dueDate ? dueDate : null,
        payment_method: method,
      }),
    onSuccess: () => {
      toast.success("Payment recorded.");
      afterRentalChange();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (!rental) return null;

  return (
    <Modal open={open} onClose={onClose} title="Record payment" description={`${rental.customer?.name ?? "Customer"} · ${rental.invoice_number ?? ""}`} size="sm">
      <div className="space-y-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Currently due: <strong className="text-slate-900 dark:text-slate-100">{currency(rental.amount_due)}</strong>
        </p>
        <Input label="Amount received" type="number" inputMode="decimal" min={0} max={rental.amount_due} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <PaymentMethodSelect value={method} onChange={setMethod} />
        {canWriteOff && (
          <Input
            label="Extra discount (write-off)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            hint="Reduces what the customer owes without a payment."
            value={writeOff}
            onChange={(e) => setWriteOff(e.target.value)}
          />
        )}
        {remaining > 0 && <Input label="Remaining due by (optional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Record payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CancelRentalModal({ open, onClose, rental }: RentalModalProps) {
  const { afterRentalChange } = useInvalidate();
  const [refund, setRefund] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("Cash");

  useEffect(() => {
    if (open) {
      setRefund(true);
      setMethod("Cash");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => rentalsApi.cancel(rental!.id, { refund_advance: refund, payment_method: method }),
    onSuccess: () => {
      toast.success("Rental cancelled and stock returned.");
      afterRentalChange();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (!rental) return null;
  const hasAdvance = rental.advance_amount > 0;

  return (
    <Modal open={open} onClose={onClose} title="Cancel rental" description={`${rental.equipment?.name ?? "Item"} × ${rental.quantity} for ${rental.customer?.name ?? "customer"}`} size="sm">
      <div className="space-y-3 text-sm">
        <p className="text-slate-600 dark:text-slate-300">The units go back into stock and the rental is marked cancelled. This can't be undone.</p>
        {hasAdvance && (
          <>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
              <span>
                Refund the advance of <strong>{currency(rental.advance_amount)}</strong> to the customer
              </span>
            </label>
            {refund && <PaymentMethodSelect value={method} onChange={setMethod} label="Refunded by" />}
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Keep rental
          </Button>
          <Button variant="danger" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Cancel rental
          </Button>
        </div>
      </div>
    </Modal>
  );
}
