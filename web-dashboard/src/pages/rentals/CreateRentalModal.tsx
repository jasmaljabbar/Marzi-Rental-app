import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Minus, ChevronDown } from "lucide-react";
import { rentalsApi, customersApi, equipmentApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { currency } from "../../utils/format";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import type { PaymentMethod } from "../../types/models";

interface CreateRentalModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  // Pre-selects one item (and suggests its deposit as the starting advance
  // amount) — used by the Equipment page's per-row "Rent" quick action so
  // counter staff don't have to re-search for the item they just clicked from.
  prefillEquipment?: { id: string; name: string; rentPerDay: number; stockCount: number; depositAmount: number } | null;
}

interface SelectedItem {
  equipmentId: string;
  name: string;
  rentPerDay: number;
  stockCount: number;
  quantity: number;
}

export function CreateRentalModal({ open, onClose, onCreated, prefillEquipment }: CreateRentalModalProps) {
  const { afterRentalChange } = useInvalidate();

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [remark, setRemark] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");

  const debouncedCustomerSearch = useDebouncedValue(customerSearch);
  const debouncedItemSearch = useDebouncedValue(itemSearch);

  useEffect(() => {
    if (open) {
      setCustomerSearch("");
      setCustomerId("");
      setCustomerLabel("");
      setItemSearch("");
      setExpectedReturnDate("");
      setRemark("");
      setMethod("Cash");
      if (prefillEquipment && prefillEquipment.stockCount > 0) {
        setSelectedItems([
          {
            equipmentId: prefillEquipment.id,
            name: prefillEquipment.name,
            rentPerDay: prefillEquipment.rentPerDay,
            stockCount: prefillEquipment.stockCount,
            quantity: 1,
          },
        ]);
        setAdvanceAmount(String(prefillEquipment.depositAmount || 0));
      } else {
        setSelectedItems([]);
        setAdvanceAmount("0");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillEquipment?.id]);

  const { data: customersResult } = useQuery({
    queryKey: ["customers", "for-rental", debouncedCustomerSearch],
    queryFn: () => customersApi.list({ search: debouncedCustomerSearch || undefined, page: 1, page_size: 20 }),
    enabled: open,
  });

  const { data: equipmentResult } = useQuery({
    queryKey: ["equipment", "for-rental", debouncedItemSearch],
    queryFn: () => equipmentApi.list({ search: debouncedItemSearch || undefined, page: 1, page_size: 50 }),
    enabled: open && debouncedItemSearch.length > 0,
  });
  const equipmentOptions = (equipmentResult?.items ?? []).filter((e) => !e.is_archived);

  function addItem(e: (typeof equipmentOptions)[number]) {
    if (e.available_count <= 0) {
      toast.error(`${e.name} is out of stock.`);
      return;
    }
    setSelectedItems((prev) => {
      if (prev.some((p) => p.equipmentId === e.id)) return prev;
      return [...prev, { equipmentId: e.id, name: e.name, rentPerDay: e.rent_per_day, stockCount: e.available_count, quantity: 1 }];
    });
  }

  function updateQty(equipmentId: string, quantity: number) {
    setSelectedItems((prev) => prev.map((p) => (p.equipmentId === equipmentId ? { ...p, quantity: Math.max(1, Math.min(quantity, p.stockCount)) } : p)));
  }

  function removeItem(equipmentId: string) {
    setSelectedItems((prev) => prev.filter((p) => p.equipmentId !== equipmentId));
  }

  const mutation = useMutation({
    mutationFn: () =>
      rentalsApi.createBulk({
        customer_id: customerId,
        items: selectedItems.map((i) => ({ equipment_id: i.equipmentId, quantity: i.quantity })),
        expected_return_date: expectedReturnDate || undefined,
        advance_amount: Number(advanceAmount) || 0,
        remark: remark || undefined,
        payment_method: method,
      }),
    onSuccess: () => {
      toast.success(`Rental created for ${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"}.`);
      afterRentalChange();
      onCreated?.();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const estimatedTotal = (() => {
    if (!expectedReturnDate || selectedItems.length === 0) return null;
    const days = Math.max(Math.ceil((new Date(expectedReturnDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 1);
    return selectedItems.reduce((sum, i) => sum + days * i.rentPerDay * i.quantity, 0);
  })();

  function handleSubmit() {
    if (!customerId) return toast.error("Pick a customer first.");
    if (selectedItems.length === 0) return toast.error("Add at least one item.");
    mutation.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title="Create rental" size="lg">
      <div className="space-y-4">
        <div className="relative">
          <Input
            label="Customer (name or phone)"
            value={customerId ? customerLabel : customerSearch}
            onChange={(e) => {
              setCustomerId("");
              setCustomerSearch(e.target.value);
              setCustomerDropdownOpen(true);
            }}
            onFocus={() => setCustomerDropdownOpen(true)}
            onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 150)}
            autoFocus
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-slate-400" />
          {customerDropdownOpen && !customerId && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {(customersResult?.items ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCustomerId(c.id);
                    setCustomerLabel(`${c.name} — ${c.phone}`);
                    setCustomerDropdownOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {c.name} — {c.phone}
                </button>
              ))}
              {customersResult?.items.length === 0 && (
                <p className="px-3 py-1.5 text-sm text-slate-400">No match. Add them from the Customers page first.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Items</p>
          <SearchInput placeholder="Search equipment" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
          {itemSearch && (
            <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {equipmentOptions.map((e) => {
                const available = e.available_count;
                const selected = selectedItems.some((p) => p.equipmentId === e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    disabled={available <= 0 || selected}
                    onClick={() => addItem(e)}
                    className={`rounded-md border p-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    }`}
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-100">{e.name}</p>
                    <p className="text-slate-400">
                      {currency(e.rent_per_day)}/day · Stock {available}
                    </p>
                  </button>
                );
              })}
              {equipmentOptions.length === 0 && <p className="col-span-full py-1 text-xs text-slate-400">No matches.</p>}
            </div>
          )}
        </div>

        {selectedItems.length > 0 && (
          <div className="space-y-1.5">
            {selectedItems.map((item) => (
              <div key={item.equipmentId} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-800">
                <span className="text-slate-700 dark:text-slate-200">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => updateQty(item.equipmentId, item.quantity - 1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <Button variant="ghost" size="sm" onClick={() => updateQty(item.equipmentId, item.quantity + 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <button type="button" onClick={() => removeItem(item.equipmentId)} className="ml-2 text-xs text-red-500 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Expected return date" type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
          <div>
            <Input
              label="Advance / deposit"
              type="number"
              min={0}
              max={estimatedTotal ?? undefined}
              step="0.01"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
            />
            {estimatedTotal !== null && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Estimated rental total: {currency(estimatedTotal)}. Advance can't exceed this.</p>
            )}
          </div>
        </div>
        {Number(advanceAmount) > 0 && (
          <div className="sm:w-1/2">
            <PaymentMethodSelect value={method} onChange={setMethod} label="Advance paid by" />
          </div>
        )}
        <Textarea label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            Create rental ({selectedItems.length} item{selectedItems.length === 1 ? "" : "s"})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
