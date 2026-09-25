import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customersApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useBusyFlags } from "../../hooks/useBusyFlags";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { ImageUpload } from "../../components/ui/ImageUpload";
import type { Customer } from "../../types/models";

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSaved?: (customer: Customer) => void;
}

export function CustomerFormModal({ open, onClose, customer, onSaved }: CustomerFormModalProps) {
  const isEdit = Boolean(customer);
  const queryClient = useQueryClient();
  const { afterCustomerChange } = useInvalidate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string[]>([]);
  const [docUrl, setDocUrl] = useState<string[]>([]);
  const uploads = useBusyFlags();

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? "");
    setPhone(customer?.phone ?? "");
    setAddress(customer?.address ?? "");
    setPhotoUrl(customer?.photo_url ? [customer.photo_url] : []);
    setDocUrl(customer?.doc_url ? [customer.doc_url] : []);
  }, [open, customer]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, phone, address: address || null, photo_url: photoUrl[0] ?? null, doc_url: docUrl[0] ?? null };
      return isEdit ? customersApi.update(customer!.id, payload) : customersApi.create(payload);
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? "Customer updated." : "Customer added.");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      afterCustomerChange();
      onSaved?.(saved);
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (uploads.anyBusy) {
      toast.error("Wait for the photos to finish uploading, or remove the ones that failed.");
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit customer" : "Add customer"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <Textarea label="Address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <ImageUpload label="Profile photo" kind="customer_photo" value={photoUrl} onChange={setPhotoUrl} max={1} onBusyChange={(busy) => uploads.setBusy("photo", busy)} />
            <p className="mt-1 text-xs text-slate-400">Shown next to the customer in lists.</p>
          </div>
          <div>
            <ImageUpload label="ID document" kind="customer_doc" value={docUrl} onChange={setDocUrl} max={1} onBusyChange={(busy) => uploads.setBusy("doc", busy)} />
            <p className="mt-1 text-xs text-slate-400">Kept private. Never used as the customer's picture.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending} disabled={uploads.anyBusy}>
            {isEdit ? "Save changes" : "Add customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
