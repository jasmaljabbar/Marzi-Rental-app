import { Select } from "../../components/ui/Select";
import type { PaymentMethod } from "../../types/models";

export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "UPI", "Card", "Bank Transfer", "Other"];

export function PaymentMethodSelect({ value, onChange, label = "Paid by" }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void; label?: string }) {
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value as PaymentMethod)}>
      {PAYMENT_METHODS.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </Select>
  );
}
