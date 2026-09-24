import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { categoriesApi, equipmentApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useBusyFlags } from "../../hooks/useBusyFlags";
import { MAX_EQUIPMENT_IMAGES } from "../../utils/image";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { ImageUpload } from "../../components/ui/ImageUpload";
import type { Equipment } from "../../types/models";

interface EquipmentFormModalProps {
  open: boolean;
  onClose: () => void;
  equipment?: Equipment | null;
  onSaved?: (equipment: Equipment) => void;
}

export function EquipmentFormModal({ open, onClose, equipment, onSaved }: EquipmentFormModalProps) {
  const isEdit = Boolean(equipment);
  const queryClient = useQueryClient();
  const { afterEquipmentCatalogChange } = useInvalidate();

  const { data: categoriesResult } = useQuery({
    queryKey: ["categories", "for-select"],
    queryFn: () => categoriesApi.list({ page: 1, page_size: 500 }),
    enabled: open,
  });
  const categories = categoriesResult?.items ?? [];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockCount, setStockCount] = useState("0");
  const [rentPerDay, setRentPerDay] = useState("");
  const [depositAmount, setDepositAmount] = useState("0");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [usefulLife, setUsefulLife] = useState("5");
  const [images, setImages] = useState<string[]>([]);
  const uploads = useBusyFlags();

  useEffect(() => {
    if (!open) return;
    setName(equipment?.name ?? "");
    setDescription(equipment?.description ?? "");
    setCategoryId(equipment?.category_id ?? categories[0]?.id ?? "");
    setStockCount(String(equipment?.stock_count ?? 0));
    setRentPerDay(equipment ? String(equipment.rent_per_day) : "");
    setDepositAmount(String(equipment?.deposit_amount ?? 0));
    setPurchasePrice(String(equipment?.purchase_price_per_unit ?? 0));
    setUsefulLife(String(equipment?.useful_life_years ?? 5));
    setImages(equipment?.images ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, equipment?.id]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        rent_per_day: Number(rentPerDay) || 0,
        deposit_amount: Number(depositAmount) || 0,
        purchase_price_per_unit: Number(purchasePrice) || 0,
        useful_life_years: Number(usefulLife) || 5,
        category_id: categoryId,
        images,
      };
      return isEdit
        ? equipmentApi.update(equipment!.id, payload)
        : equipmentApi.create({ ...payload, stock_count: Number(stockCount) || 0 });
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? "Equipment updated." : "Equipment added.");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      afterEquipmentCatalogChange();
      onSaved?.(saved);
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Pick a category first.");
      return;
    }
    if (uploads.anyBusy) {
      toast.error("Wait for the photos to finish uploading, or remove the ones that failed.");
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit equipment" : "Add equipment"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="" disabled>
              Select a category…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {!isEdit && (
            <Input
              label="Initial stock"
              type="number"
              min={0}
              value={stockCount}
              onChange={(e) => setStockCount(e.target.value)}
            />
          )}
          <Input
            label="Rent / day"
            type="number"
            min={0}
            step="0.01"
            value={rentPerDay}
            onChange={(e) => setRentPerDay(e.target.value)}
            required
          />
          <Input
            label="Deposit amount"
            type="number"
            min={0}
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <Input
            label="Purchase price / unit"
            type="number"
            min={0}
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />
          <Input
            label="Useful life (yrs)"
            type="number"
            min={0}
            value={usefulLife}
            onChange={(e) => setUsefulLife(e.target.value)}
          />
        </div>

        <ImageUpload
          label="Photos"
          kind="equipment"
          value={images}
          onChange={setImages}
          max={MAX_EQUIPMENT_IMAGES}
          onBusyChange={(busy) => uploads.setBusy("photos", busy)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending} disabled={uploads.anyBusy}>
            {isEdit ? "Save changes" : "Add equipment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
