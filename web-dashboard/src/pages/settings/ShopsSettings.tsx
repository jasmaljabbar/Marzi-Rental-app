import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { shopsApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import type { Shop } from "../../types/models";

export function ShopsSettings() {
  const queryClient = useQueryClient();
  const { afterShopChange } = useInvalidate();
  const { data: shops = [], isLoading } = useQuery({ queryKey: ["shops"], queryFn: shopsApi.list });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);

  useEffect(() => {
    if (formOpen) {
      setName(editing?.name ?? "");
      setAddress(editing?.address ?? "");
      setPhone(editing?.phone ?? "");
    }
  }, [formOpen, editing]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["shops"] });
    afterShopChange();
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? shopsApi.update(editing.id, { name, address, phone })
        : shopsApi.create({ name, address: address || undefined, phone: phone || undefined }),
    onSuccess: () => {
      toast.success(editing ? "Shop updated." : "Shop added.");
      invalidate();
      setFormOpen(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (shop: Shop) => shopsApi.update(shop.id, { is_active: !shop.is_active }),
    onSuccess: () => {
      toast.success("Shop updated.");
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shopsApi.remove(id),
    onSuccess: () => {
      toast.success("Shop removed.");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Shops</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add shop
        </Button>
      </div>

      {!isLoading && (
        <div className="space-y-2">
          {shops.map((shop) => (
            <div key={shop.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{shop.name}</p>
                <p className="text-xs text-slate-400">{[shop.address, shop.phone].filter(Boolean).join(" · ") || "No address/phone on file"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={shop.is_active ? "emerald" : "neutral"}>{shop.is_active ? "Active" : "Inactive"}</Badge>
                <Button variant="ghost" size="sm" onClick={() => toggleActiveMutation.mutate(shop)}>
                  {shop.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(shop);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(shop)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit shop" : "Add shop"} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-3"
        >
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Remove shop"
        description={`Remove "${deleteTarget?.name}"? Shops with active rentals or your only remaining shop can't be removed.`}
        confirmLabel="Remove"
        danger
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}
