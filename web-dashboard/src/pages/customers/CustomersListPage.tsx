import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Upload, Archive, ArchiveRestore, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { customersApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useBulkOperation } from "../../hooks/useBulkOperation";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { isOwnerOrAdmin } from "../../utils/permissions";
import { useAuth } from "../../context/AuthContext";
import { exportToCsv } from "../../utils/export/csv";
import { exportToExcel } from "../../utils/export/xlsx";
import { waLink } from "../../utils/whatsapp";
import { RISK_LABELS, RISK_TONES } from "../../utils/customerRisk";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { Table } from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Tabs } from "../../components/ui/Tabs";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { BulkResultDialog } from "../../components/ui/BulkResultDialog";
import { ImportModal } from "../../components/ui/ImportModal";
import { CustomerFormModal } from "./CustomerFormModal";
import type { Customer } from "../../types/models";
import type { CustomerInput } from "../../api/services/customers";

export function CustomersListPage() {
  const { user } = useAuth();
  const canManage = isOwnerOrAdmin(user?.role);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { afterCustomerChange } = useInvalidate();

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkResultOpen, setBulkResultOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customers", "list", tab, debouncedSearch, page],
    queryFn: () =>
      customersApi.list({ page, page_size: 20, search: debouncedSearch || undefined, include_archived: tab === "archived", include_stats: true }),
  });
  const items = data?.items ?? [];

  function invalidateList() {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    afterCustomerChange();
  }

  const archiveMutation = useMutation({
    mutationFn: (c: Customer) => (c.is_archived ? customersApi.restore(c.id) : customersApi.archive(c.id)),
    onSuccess: (_, c) => {
      toast.success(c.is_archived ? "Customer restored." : "Customer archived.");
      invalidateList();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => {
      toast.success("Customer deleted.");
      setDeleteTarget(null);
      invalidateList();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const bulk = useBulkOperation<Customer>();
  const [bulkResult, setBulkResult] = useState<Awaited<ReturnType<typeof bulk.run>> | null>(null);

  async function handleBulkArchive() {
    const targets = items.filter((c) => selected.has(c.id));
    const outcome = await bulk.run(targets, (c) => (tab === "archived" ? customersApi.restore(c.id) : customersApi.archive(c.id)));
    setBulkResult(outcome);
    setBulkResultOpen(true);
    setSelected(new Set());
    invalidateList();
  }

  function exportRows(c: Customer) {
    const info = c.stats;
    return {
      name: c.name,
      phone: c.phone,
      address: c.address ?? "",
      total_rentals: info?.total_rentals ?? 0,
      risk: info?.risk ? RISK_LABELS[info.risk] : "",
      status: c.is_archived ? "Archived" : "Active",
    };
  }
  const EXPORT_COLUMNS = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "total_rentals", label: "Total Rentals" },
    { key: "risk", label: "Risk" },
    { key: "status", label: "Status" },
  ];

  const columns: Array<TableColumn<Customer>> = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <div className="flex items-center gap-2">
          <Avatar src={c.photo_thumb_url} fallbackSrc={c.photo_url} name={c.name} />
          <span className="font-medium text-slate-900 dark:text-slate-100">{c.name}</span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <span>{c.phone}</span>
          <a
            href={waLink(c.phone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Message on WhatsApp"
            className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        </div>
      ),
    },
    { key: "address", header: "Address", render: (c) => c.address ?? "—" },
    { key: "rentals", header: "Total Rentals", render: (c) => c.stats?.total_rentals ?? 0 },
    {
      key: "risk",
      header: "Risk",
      render: (c) => {
        const risk = c.stats?.risk;
        return risk ? <Badge tone={RISK_TONES[risk]}>{RISK_LABELS[risk]}</Badge> : "—";
      },
    },
    { key: "status", header: "Status", render: (c) => (c.is_archived ? <Badge tone="neutral">Archived</Badge> : <Badge tone="emerald">Active</Badge>) },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => archiveMutation.mutate(c)} title={c.is_archived ? "Restore" : "Archive"}>
            {c.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)} title="Delete">
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Customers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Contacts, documents, and rental history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportToCsv("customers.csv", items.map(exportRows), EXPORT_COLUMNS)}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => exportToExcel("customers.xlsx", "Customers", items.map(exportRows), EXPORT_COLUMNS)}>
            <Download className="h-4 w-4" />
            Excel
          </Button>
          {canManage && (
            <>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Add customer
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
          <SearchInput
            placeholder="Search name or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
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
          rowKey={(c) => c.id}
          isLoading={isLoading}
          error={isError ? error : undefined}
          onRetry={() => refetch()}
          emptyTitle={tab === "archived" ? "No archived customers" : "No customers yet"}
          emptyDescription={tab === "active" ? "Add your first customer to start creating rentals." : undefined}
          selectedKeys={canManage ? selected : undefined}
          onToggleSelect={
            canManage
              ? (id) =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
              : undefined
          }
          onToggleSelectAll={canManage ? () => setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((c) => c.id)))) : undefined}
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
        />

        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}
      </Card>

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete customer"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        isLoading={deleteMutation.isPending}
      />

      <BulkResultDialog open={bulkResultOpen} onClose={() => setBulkResultOpen(false)} result={bulkResult} itemLabel={(c) => c.name} />

      <ImportModal<CustomerInput>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import customers"
        templateColumns={["name", "phone", "address"]}
        rowLabel={(raw) => raw.name || "(unnamed row)"}
        parseRow={(raw) => {
          if (!raw.name?.trim()) return { error: "name is required" };
          if (!raw.phone?.trim()) return { error: "phone is required" };
          return { data: { name: raw.name.trim(), phone: raw.phone.trim(), address: raw.address?.trim() || null } };
        }}
        createRow={(row) => customersApi.create(row)}
        onImported={invalidateList}
      />
    </div>
  );
}
