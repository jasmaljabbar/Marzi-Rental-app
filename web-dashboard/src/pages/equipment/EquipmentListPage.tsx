import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Upload, Archive, ArchiveRestore, Trash2, Copy, PackagePlus, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { categoriesApi, equipmentApi, rentalsApi, settingsApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useBulkOperation } from "../../hooks/useBulkOperation";
import { Img } from "../../components/ui/Img";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { isOwnerOrAdmin } from "../../utils/permissions";
import { useAuth } from "../../context/AuthContext";
import { currency } from "../../utils/format";
import { exportToCsv } from "../../utils/export/csv";
import { exportToExcel } from "../../utils/export/xlsx";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { Table } from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Tabs } from "../../components/ui/Tabs";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { BulkResultDialog } from "../../components/ui/BulkResultDialog";
import { ImportModal } from "../../components/ui/ImportModal";
import { EquipmentFormModal } from "./EquipmentFormModal";
import { CreateRentalModal } from "../rentals/CreateRentalModal";
import type { Equipment } from "../../types/models";
import type { EquipmentInput } from "../../api/services/equipment";

const DEFAULT_LOW_STOCK_THRESHOLD = 2;
type QuickFilter = "all" | "available" | "on-rent" | "under-repair";

export function EquipmentListPage() {
  const { user } = useAuth();
  const canManage = isOwnerOrAdmin(user?.role);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { afterEquipmentCatalogChange, afterEquipmentDelete } = useInvalidate();

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkResultOpen, setBulkResultOpen] = useState(false);
  const [rentTarget, setRentTarget] = useState<Equipment | null>(null);

  const wide = quickFilter !== "all";
  const pageSize = wide ? 500 : 20;

  const { data, isLoading } = useQuery({
    queryKey: ["equipment", "list", tab, debouncedSearch, categoryId, wide ? 1 : page, pageSize],
    queryFn: () =>
      equipmentApi.list({
        page: wide ? 1 : page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        category_id: categoryId || undefined,
        include_archived: tab === "archived",
      }),
  });

  const { data: categoriesResult } = useQuery({
    queryKey: ["categories", "for-select"],
    queryFn: () => categoriesApi.list({ page: 1, page_size: 500 }),
  });
  const categories = categoriesResult?.items ?? [];

  const { data: lowStockSetting } = useQuery({
    queryKey: ["settings", "low_stock_threshold"],
    queryFn: () => settingsApi.get("low_stock_threshold"),
  });
  const threshold = Number(lowStockSetting?.value) || DEFAULT_LOW_STOCK_THRESHOLD;

  // "On rent" needs to know which equipment currently has units out — stock_count
  // alone can't tell us that (createRental already excludes rented units from it).
  const { data: activeRentals } = useQuery({
    queryKey: ["rentals", "active", "for-equipment-filter"],
    queryFn: () => rentalsApi.list({ status: "Active", page: 1, page_size: 500 }),
  });
  const rentedOutIds = useMemo(() => new Set((activeRentals?.items ?? []).map((r) => r.equipment_id)), [activeRentals]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (quickFilter === "available") return all.filter((e) => e.stock_count > 0);
    if (quickFilter === "on-rent") return all.filter((e) => rentedOutIds.has(e.id));
    if (quickFilter === "under-repair") return all.filter((e) => e.damaged_count > 0);
    return all;
  }, [data, quickFilter, rentedOutIds]);

  function invalidateList() {
    queryClient.invalidateQueries({ queryKey: ["equipment"] });
  }

  const archiveMutation = useMutation({
    mutationFn: (e: Equipment) => (e.is_archived ? equipmentApi.restore(e.id) : equipmentApi.archive(e.id)),
    onSuccess: (_, e) => {
      toast.success(e.is_archived ? "Equipment restored." : "Equipment archived.");
      invalidateList();
      afterEquipmentCatalogChange();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.remove(id),
    onSuccess: () => {
      toast.success("Equipment deleted.");
      setDeleteTarget(null);
      invalidateList();
      afterEquipmentDelete();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.duplicate(id),
    onSuccess: () => {
      toast.success("Equipment duplicated.");
      invalidateList();
      afterEquipmentCatalogChange();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const bulk = useBulkOperation<Equipment>();
  const [bulkResult, setBulkResult] = useState<Awaited<ReturnType<typeof bulk.run>> | null>(null);

  async function handleBulkArchive() {
    const targets = items.filter((e) => selected.has(e.id));
    const outcome = await bulk.run(targets, (e) => (tab === "archived" ? equipmentApi.restore(e.id) : equipmentApi.archive(e.id)));
    setBulkResult(outcome);
    setBulkResultOpen(true);
    setSelected(new Set());
    invalidateList();
    afterEquipmentCatalogChange();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportRows(e: Equipment) {
    const category = categories.find((c) => c.id === e.category_id);
    return {
      name: e.name,
      category: category?.name ?? "",
      stock_count: e.stock_count,
      damaged_count: e.damaged_count,
      rent_per_day: e.rent_per_day,
      deposit_amount: e.deposit_amount,
      purchase_price_per_unit: e.purchase_price_per_unit,
      useful_life_years: e.useful_life_years,
      status: e.is_archived ? "Archived" : "Active",
    };
  }

  const EXPORT_COLUMNS = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "stock_count", label: "Stock" },
    { key: "damaged_count", label: "Damaged" },
    { key: "rent_per_day", label: "Rent/Day" },
    { key: "deposit_amount", label: "Deposit" },
    { key: "purchase_price_per_unit", label: "Purchase Price/Unit" },
    { key: "useful_life_years", label: "Useful Life (yrs)" },
    { key: "status", label: "Status" },
  ];

  const columns: Array<TableColumn<Equipment>> = [
    {
      key: "name",
      header: "Name",
      render: (e) => (
        <div className="flex items-center gap-2">
          <Img src={e.image_thumbs?.[0] ?? e.images[0]} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
          <span className="font-medium text-slate-900 dark:text-slate-100">{e.name}</span>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (e) => categories.find((c) => c.id === e.category_id)?.name ?? "—" },
    {
      key: "stock",
      header: "Stock",
      render: (e) => (
        <span className={e.stock_count <= threshold ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
          {e.stock_count}
          {e.stock_count <= threshold && " (low)"}
        </span>
      ),
    },
    { key: "damaged", header: "Damaged", render: (e) => (e.damaged_count > 0 ? <Badge tone="amber">{e.damaged_count}</Badge> : "—") },
    { key: "rent", header: "Rent/Day", render: (e) => currency(e.rent_per_day) },
    { key: "deposit", header: "Deposit", render: (e) => currency(e.deposit_amount) },
    { key: "status", header: "Status", render: (e) => (e.is_archived ? <Badge tone="neutral">Archived</Badge> : <Badge tone="emerald">Active</Badge>) },
  ];

  if (tab === "active") {
    columns.push({
      key: "rent-action",
      header: "",
      render: (e) => (
        <Button
          size="sm"
          disabled={e.stock_count <= 0}
          title={e.stock_count <= 0 ? "No stock available to rent" : "Rent this item"}
          onClick={(evt) => {
            evt.stopPropagation();
            setRentTarget(e);
          }}
        >
          <CalendarClock className="h-4 w-4" />
          Rent
        </Button>
      ),
    });
  }

  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      className: "text-right",
      render: (e) => (
        <div className="flex justify-end gap-1" onClick={(evt) => evt.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(e.id)} title="Duplicate">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => archiveMutation.mutate(e)} title={e.is_archived ? "Restore" : "Archive"}>
            {e.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(e)} title="Delete">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Equipment</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Catalog, stock levels, and maintenance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportToCsv("equipment.csv", items.map(exportRows), EXPORT_COLUMNS)}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => exportToExcel("equipment.xlsx", "Equipment", items.map(exportRows), EXPORT_COLUMNS)}>
            <Download className="h-4 w-4" />
            Excel
          </Button>
          {canManage && (
            <>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add equipment
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              { key: "active", label: "Active" },
              { key: "archived", label: "Archived" },
            ]}
            active={tab}
            onChange={(k) => {
              setTab(k as "active" | "archived");
              setPage(1);
              setSelected(new Set());
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              placeholder="Search equipment"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-56"
            />
            <Select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="w-40"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          {(["all", "available", "on-rent", "under-repair"] as QuickFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setQuickFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                quickFilter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {f === "all" ? "All" : f === "available" ? "Available" : f === "on-rent" ? "On rent" : "Under repair"}
            </button>
          ))}
        </div>

        {canManage && selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300">
            {selected.size} selected
            <Button size="sm" variant="secondary" onClick={handleBulkArchive} isLoading={bulk.isRunning}>
              {tab === "archived" ? "Restore selected" : "Archive selected"}
            </Button>
          </div>
        )}

        <Table
          columns={columns}
          rows={items}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          emptyTitle={tab === "archived" ? "No archived equipment" : "No equipment yet"}
          emptyDescription={tab === "active" ? "Add your first item to start tracking rentable inventory." : undefined}
          selectedKeys={canManage ? selected : undefined}
          onToggleSelect={canManage ? toggleSelect : undefined}
          onToggleSelectAll={canManage ? () => setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((e) => e.id)))) : undefined}
          onRowClick={(e) => navigate(`/equipment/${e.id}`)}
        />

        {!wide && data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}
      </Card>

      <EquipmentFormModal open={formOpen} onClose={() => setFormOpen(false)} equipment={editing} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete equipment"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone. Consider archiving instead if you might need it again.`}
        confirmLabel="Delete"
        danger
        isLoading={deleteMutation.isPending}
      />

      <BulkResultDialog open={bulkResultOpen} onClose={() => setBulkResultOpen(false)} result={bulkResult} itemLabel={(e) => e.name} />

      <ImportModal<EquipmentInput>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import equipment"
        templateColumns={["name", "category", "rent_per_day", "deposit_amount", "purchase_price_per_unit", "useful_life_years", "stock_count"]}
        rowLabel={(raw) => raw.name || "(unnamed row)"}
        parseRow={(raw) => {
          if (!raw.name?.trim()) return { error: "name is required" };
          const rentPerDay = Number(raw.rent_per_day);
          if (!raw.rent_per_day || Number.isNaN(rentPerDay) || rentPerDay < 0) return { error: "rent_per_day must be a non-negative number" };
          const category = categories.find((c) => c.name.toLowerCase() === raw.category?.trim().toLowerCase());
          if (!category) return { error: `category "${raw.category}" not found` };
          return {
            data: {
              name: raw.name.trim(),
              category_id: category.id,
              rent_per_day: rentPerDay,
              deposit_amount: Number(raw.deposit_amount) || 0,
              purchase_price_per_unit: Number(raw.purchase_price_per_unit) || 0,
              useful_life_years: Number(raw.useful_life_years) || 5,
              stock_count: Number(raw.stock_count) || 0,
            },
          };
        }}
        createRow={(row) => equipmentApi.create(row)}
        onImported={() => {
          invalidateList();
          afterEquipmentCatalogChange();
        }}
      />

      <div className="flex items-center gap-1 text-xs text-slate-400">
        <PackagePlus className="h-3.5 w-3.5" />
        Low-stock threshold: {threshold} unit{threshold === 1 ? "" : "s"} (change it in Settings)
      </div>

      <CreateRentalModal
        open={Boolean(rentTarget)}
        onClose={() => setRentTarget(null)}
        prefillEquipment={
          rentTarget
            ? {
                id: rentTarget.id,
                name: rentTarget.name,
                rentPerDay: rentTarget.rent_per_day,
                stockCount: rentTarget.stock_count,
                depositAmount: rentTarget.deposit_amount,
              }
            : null
        }
      />
    </div>
  );
}
