import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  Copy,
  PackagePlus,
  AlertTriangle,
  Wrench,
  Recycle,
  Tag,
} from "lucide-react";
import { equipmentApi, categoriesApi, customersApi, rentalsApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useAccountPlan } from "../../hooks/useAccountPlan";
import { isOwnerOrAdmin } from "../../utils/permissions";
import { useAuth } from "../../context/AuthContext";
import { currency, formatDate, formatDateTime, daysSince } from "../../utils/format";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { EquipmentFormModal } from "./EquipmentFormModal";
import { AddStockModal, MarkDamagedModal, RepairModal, ScrapModal, SellModal } from "./EquipmentActionModals";
import { ReturnModal } from "../rentals/ReturnModal";
import { Img } from "../../components/ui/Img";
import type { Rental } from "../../types/models";

type ActionModal = "edit" | "stock" | "damage" | "repair" | "scrap" | "sell" | null;

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = isOwnerOrAdmin(user?.role);
  const { hasFeature } = useAccountPlan();
  const canMaintain = hasFeature("maintenance");
  const { afterEquipmentCatalogChange, afterEquipmentDelete } = useInvalidate();

  const [modal, setModal] = useState<ActionModal>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [returningRental, setReturningRental] = useState<Rental | null>(null);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment", "detail", id],
    queryFn: () => equipmentApi.get(id!),
    enabled: Boolean(id),
  });

  const { data: categoriesResult } = useQuery({
    queryKey: ["categories", "for-select"],
    queryFn: () => categoriesApi.list({ page: 1, page_size: 500 }),
  });
  const category = categoriesResult?.items.find((c) => c.id === equipment?.category_id);

  const { data: activeRentals } = useQuery({
    queryKey: ["rentals", "active", "all"],
    queryFn: () => rentalsApi.list({ status: "Active", page: 1, page_size: 200 }),
    enabled: Boolean(id),
  });
  const { data: rentalHistory } = useQuery({
    queryKey: ["rentals", "history", "all-for-equipment"],
    queryFn: () => rentalsApi.history({ include_cancelled: true, page: 1, page_size: 200 }),
    enabled: Boolean(id),
  });

  const { data: customersResult } = useQuery({
    queryKey: ["customers", "for-join"],
    queryFn: () => customersApi.list({ page: 1, page_size: 500 }),
  });
  const customerName = (customerId: string) => customersResult?.items.find((c) => c.id === customerId)?.name ?? "Unknown";
  const customerPhone = (customerId: string) => customersResult?.items.find((c) => c.id === customerId)?.phone ?? "";

  const holders = useMemo(() => (activeRentals?.items ?? []).filter((r) => r.equipment_id === id), [activeRentals, id]);
  const history = useMemo(
    () => (rentalHistory?.items ?? []).filter((r) => r.equipment_id === id).sort((a, b) => (b.amount_due || 0) - (a.amount_due || 0)),
    [rentalHistory, id]
  );

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["equipment"] });
  }

  const archiveMutation = useMutation({
    mutationFn: () => (equipment!.is_archived ? equipmentApi.restore(equipment!.id) : equipmentApi.archive(equipment!.id)),
    onSuccess: () => {
      toast.success(equipment!.is_archived ? "Restored." : "Archived.");
      invalidateAll();
      afterEquipmentCatalogChange();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => equipmentApi.duplicate(equipment!.id),
    onSuccess: (copy) => {
      toast.success("Duplicated.");
      afterEquipmentCatalogChange();
      navigate(`/equipment/${copy.id}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: () => equipmentApi.remove(equipment!.id),
    onSuccess: () => {
      toast.success("Deleted.");
      afterEquipmentDelete();
      navigate("/equipment");
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (!equipment) return <p className="text-sm text-red-600 dark:text-red-400">Equipment not found.</p>;

  return (
    <div className="space-y-4">
      <Link to="/equipment" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        <ArrowLeft className="h-4 w-4" />
        All equipment
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            {equipment.images[0] ? (
              <Img src={equipment.images[0]} alt={equipment.name} className="h-24 w-24 rounded-lg object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Tag className="h-8 w-8 text-slate-300" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{equipment.name}</h1>
                {equipment.is_archived && <Badge tone="neutral">Archived</Badge>}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{category?.name ?? "Uncategorized"}</p>
              {equipment.description && <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-300">{equipment.description}</p>}
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModal("edit")}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="secondary" size="sm" onClick={() => duplicateMutation.mutate()} isLoading={duplicateMutation.isPending}>
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="secondary" size="sm" onClick={() => archiveMutation.mutate()} isLoading={archiveMutation.isPending}>
                {equipment.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {equipment.is_archived ? "Restore" : "Archive"}
              </Button>
              <Button variant="danger-outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Stock" value={equipment.stock_count} />
          <Stat label="Damaged" value={equipment.damaged_count} tone={equipment.damaged_count > 0 ? "amber" : undefined} />
          <Stat label="Rent / day" value={currency(equipment.rent_per_day)} />
          <Stat label="Purchase / unit" value={currency(equipment.purchase_price_per_unit)} />
        </div>
      </Card>

      {canManage && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setModal("stock")}>
              <PackagePlus className="h-4 w-4" />
              Add stock
            </Button>
            {canMaintain && (
              <Button variant="secondary" onClick={() => setModal("damage")}>
                <AlertTriangle className="h-4 w-4" />
                Mark damaged
              </Button>
            )}
            <Button variant="secondary" onClick={() => setModal("scrap")}>
              <Recycle className="h-4 w-4" />
              Mark as scrap
            </Button>
            <Button variant="secondary" onClick={() => setModal("sell")}>
              <Tag className="h-4 w-4" />
              Sell
            </Button>
            {canMaintain && equipment.damaged_count > 0 && (
              <Button variant="secondary" onClick={() => setModal("repair")}>
                <Wrench className="h-4 w-4" />
                Fix / repair
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Current holders ({holders.length})</h2>
        {holders.length === 0 ? (
          <EmptyState title="No active rentals" description="This item isn't currently rented out." />
        ) : (
          <div className="space-y-2">
            {holders.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div>
                  <Link to={`/customers/${r.customer_id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                    {customerName(r.customer_id)}
                  </Link>
                  <p className="text-xs text-slate-400">
                    Qty {r.quantity} · Since {formatDate(r.rented_at)} ({daysSince(r.rented_at)}d)
                  </p>
                </div>
                <Button size="sm" onClick={() => setReturningRental(r)}>
                  Complete return
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Rental history</h2>
        {history.length === 0 ? (
          <EmptyState title="No rental history yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Customer</th>
                  <th className="py-1.5 pr-3 font-medium">Status</th>
                  <th className="py-1.5 pr-3 font-medium">Total</th>
                  <th className="py-1.5 pr-3 font-medium">Paid</th>
                  <th className="py-1.5 font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.slice(0, 25).map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">
                      <Link to={`/customers/${r.customer_id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        {customerName(r.customer_id)}
                      </Link>{" "}
                      · {customerPhone(r.customer_id)}
                    </td>
                    <td className="py-1.5 pr-3">
                      <Badge tone={r.status === "Completed" ? "emerald" : "neutral"}>{r.status}</Badge>
                    </td>
                    <td className="py-1.5 pr-3">{currency(r.total_price)}</td>
                    <td className="py-1.5 pr-3">{currency((r.advance_amount || 0) + (r.amount_paid_on_return || 0))}</td>
                    <td className={`py-1.5 ${r.amount_due > 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-400"}`}>
                      {currency(r.amount_due)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Damage & repair log</h2>
        {equipment.maintenance_logs.length === 0 ? (
          <EmptyState title="No maintenance history" />
        ) : (
          <ul className="space-y-2">
            {equipment.maintenance_logs
              .slice()
              .reverse()
              .map((log) => (
                <li key={log.id} className="flex items-start gap-2 text-sm">
                  <Badge tone={log.action === "Repair" ? "emerald" : log.action === "Scrap" ? "amber" : "red"}>{log.action}</Badge>
                  <span className="text-slate-600 dark:text-slate-300">
                    {log.remark || "—"}
                    {log.cost > 0 && ` · ${currency(log.cost)}`}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-slate-400">{formatDateTime(log.created_at)}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <EquipmentFormModal open={modal === "edit"} onClose={() => setModal(null)} equipment={equipment} />
      <AddStockModal open={modal === "stock"} onClose={() => setModal(null)} equipment={equipment} />
      <MarkDamagedModal open={modal === "damage"} onClose={() => setModal(null)} equipment={equipment} />
      <RepairModal open={modal === "repair"} onClose={() => setModal(null)} equipment={equipment} />
      <ScrapModal open={modal === "scrap"} onClose={() => setModal(null)} equipment={equipment} />
      <SellModal open={modal === "sell"} onClose={() => setModal(null)} equipment={equipment} />
      <ReturnModal open={Boolean(returningRental)} onClose={() => setReturningRental(null)} rentals={returningRental ? [returningRental] : []} />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete equipment"
        description={`Permanently delete "${equipment.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "amber" }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>{value}</p>
    </div>
  );
}
