import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Upload, Archive, ArchiveRestore, Trash2, Receipt, Repeat, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { expensesApi, equipmentApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { isOwnerOrAdmin } from "../../utils/permissions";
import { useAuth } from "../../context/AuthContext";
import { currency, formatDate } from "../../utils/format";
import { CategoryBreakdownChart } from "../../components/charts/CategoryBreakdownChart";
import { exportToCsv } from "../../utils/export/csv";
import { exportToExcel } from "../../utils/export/xlsx";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { Table } from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import { Tabs } from "../../components/ui/Tabs";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ImportModal } from "../../components/ui/ImportModal";
import { ExpenseFormModal, EXPENSE_CATEGORY_PRESETS } from "./ExpenseFormModal";
import { RecurringExpenseModal } from "./RecurringExpenseModal";
import type { Expense, RecurringExpenseTemplate } from "../../types/models";
import type { ExpenseInput } from "../../api/services/expenses";

export function ExpensesPage() {
  const { user } = useAuth();
  const canManage = isOwnerOrAdmin(user?.role);
  const queryClient = useQueryClient();
  const { afterExpenseChange } = useInvalidate();

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [recurringFormOpen, setRecurringFormOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpenseTemplate | null>(null);
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState<RecurringExpenseTemplate | null>(null);

  // Archive tab and search are filtered on the server; the category chips
  // below filter what was loaded.
  const { data, isLoading } = useQuery({
    queryKey: ["expenses", "list", tab, debouncedSearch],
    queryFn: () => expensesApi.list({ page: 1, page_size: 500, include_archived: tab === "archived", search: debouncedSearch || undefined }),
  });

  const { data: equipmentResult } = useQuery({ queryKey: ["equipment", "for-join"], queryFn: () => equipmentApi.list({ page: 1, page_size: 500 }) });
  const equipmentName = (id: string | null) => (id ? equipmentResult?.items.find((e) => e.id === id)?.name : undefined);

  const { data: recurringTemplates } = useQuery({ queryKey: ["expenses", "recurring"], queryFn: expensesApi.listRecurring });

  const all = (data?.items ?? []).filter((e) => (tab === "archived" ? e.is_archived : !e.is_archived));
  const categories = useMemo(() => Array.from(new Set(all.map((e) => e.category))).sort(), [all]);

  const filtered = useMemo(() => {
    return all.filter((e) => {
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return e.category.toLowerCase().includes(q) || (e.remark ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [all, categoryFilter, debouncedSearch]);

  const totalSpent = all.reduce((sum, e) => sum + e.amount, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thisMonth = all.filter((e) => new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + e.amount, 0);
  const highest = all.slice().sort((a, b) => b.amount - a.amount)[0];

  const breakdown = useMemo(() => {
    const totals = new Map<string, number>();
    all.forEach((e) => totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount));
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [all]);

  function invalidateList() {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    afterExpenseChange();
  }

  const archiveMutation = useMutation({
    mutationFn: (e: Expense) => (e.is_archived ? expensesApi.restore(e.id) : expensesApi.archive(e.id)),
    onSuccess: (_, e) => {
      toast.success(e.is_archived ? "Expense restored." : "Expense archived.");
      invalidateList();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success("Expense deleted.");
      setDeleteTarget(null);
      invalidateList();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  function invalidateRecurring() {
    queryClient.invalidateQueries({ queryKey: ["expenses", "recurring"] });
  }

  const toggleRecurringActiveMutation = useMutation({
    mutationFn: (t: RecurringExpenseTemplate) => expensesApi.updateRecurring(t.id, { is_active: !t.is_active }),
    onSuccess: (_, t) => {
      toast.success(t.is_active ? "Paused." : "Resumed.");
      invalidateRecurring();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: (id: string) => expensesApi.removeRecurring(id),
    onSuccess: () => {
      toast.success("Recurring expense removed.");
      setDeleteRecurringTarget(null);
      invalidateRecurring();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  function exportRows(e: Expense) {
    return {
      category: e.category,
      amount: e.amount,
      equipment: equipmentName(e.equipment_id) ?? "",
      remark: e.remark ?? "",
      date: formatDate(e.date),
    };
  }
  const EXPORT_COLUMNS = [
    { key: "category", label: "Category" },
    { key: "amount", label: "Amount" },
    { key: "equipment", label: "Equipment" },
    { key: "remark", label: "Remark" },
    { key: "date", label: "Date" },
  ];

  const columns: Array<TableColumn<Expense>> = [
    {
      key: "category",
      header: "Category",
      render: (e) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-900 dark:text-slate-100">{e.category}</span>
          {e.recurring_template_id && (
            <span title="Auto-logged from a recurring schedule">
              <Repeat className="h-3.5 w-3.5 text-indigo-400" />
            </span>
          )}
        </div>
      ),
    },
    { key: "amount", header: "Amount", render: (e) => currency(e.amount) },
    { key: "equipment", header: "Equipment", render: (e) => equipmentName(e.equipment_id) ?? "—" },
    {
      key: "receipt",
      header: "Receipt",
      render: (e) =>
        e.receipt_url ? (
          <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" title="View receipt" className="text-indigo-600 hover:underline dark:text-indigo-400">
            <Receipt className="h-4 w-4" />
          </a>
        ) : (
          "—"
        ),
    },
    { key: "remark", header: "Notes", render: (e) => e.remark ?? "—" },
    { key: "date", header: "Date", render: (e) => formatDate(e.date) },
  ];
  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      className: "text-right",
      render: (e) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>
            Edit
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Expenses</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manual entries plus auto-logged stock/repair costs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportToCsv("expenses.csv", filtered.map(exportRows), EXPORT_COLUMNS)}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => exportToExcel("expenses.xlsx", "Expenses", filtered.map(exportRows), EXPORT_COLUMNS)}>
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
                Add expense
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total spent" value={currency(totalSpent)} tone="indigo" />
        <StatCard label="This month" value={currency(thisMonth)} tone="amber" />
        <StatCard label="Highest entry" value={highest ? currency(highest.amount) : "—"} hint={highest?.category} />
      </div>

      {breakdown.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Spend by category</h2>
          <CategoryBreakdownChart data={breakdown} />
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recurring expenses</h2>
          {canManage && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingRecurring(null);
                setRecurringFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add recurring
            </Button>
          )}
        </div>
        {!recurringTemplates || recurringTemplates.length === 0 ? (
          <p className="text-sm text-slate-400">
            None scheduled yet — e.g. monthly store rent logs itself automatically once someone opens this page on or after the due day.
          </p>
        ) : (
          <div className="space-y-1.5">
            {recurringTemplates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{t.category}</span>
                  <span className="ml-2 text-slate-400">
                    {currency(t.amount)} · Day {t.day_of_month}
                    {equipmentName(t.equipment_id) ? ` · ${equipmentName(t.equipment_id)}` : ""}
                  </span>
                  {!t.is_active && <Badge tone="neutral">Paused</Badge>}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleRecurringActiveMutation.mutate(t)} title={t.is_active ? "Pause" : "Resume"}>
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRecurring(t);
                        setRecurringFormOpen(true);
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteRecurringTarget(t)} title="Delete">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              { key: "active", label: "Active" },
              { key: "archived", label: "Archived" },
            ]}
            active={tab}
            onChange={(k) => setTab(k as "active" | "archived")}
          />
          <SearchInput placeholder="Search category or remark" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${!categoryFilter ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
          >
            All
          </button>
          {Array.from(new Set([...EXPENSE_CATEGORY_PRESETS, ...categories])).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryFilter === c ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <Table
          columns={columns}
          rows={filtered}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          emptyTitle={tab === "archived" ? "No archived expenses" : "No expenses yet"}
        />
      </Card>

      <ExpenseFormModal
        open={formOpen || Boolean(editing)}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        expense={editing}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete expense"
        description="Permanently delete this expense? This cannot be undone."
        confirmLabel="Delete"
        danger
        isLoading={deleteMutation.isPending}
      />

      <RecurringExpenseModal
        open={recurringFormOpen || Boolean(editingRecurring)}
        onClose={() => {
          setRecurringFormOpen(false);
          setEditingRecurring(null);
        }}
        template={editingRecurring}
      />

      <ConfirmDialog
        open={Boolean(deleteRecurringTarget)}
        onClose={() => setDeleteRecurringTarget(null)}
        onConfirm={() => deleteRecurringTarget && deleteRecurringMutation.mutate(deleteRecurringTarget.id)}
        title="Delete recurring expense"
        description="This stops future auto-logging. Expenses already created from it are untouched."
        confirmLabel="Delete"
        danger
        isLoading={deleteRecurringMutation.isPending}
      />

      <ImportModal<ExpenseInput>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import expenses"
        templateColumns={["category", "amount", "remark"]}
        rowLabel={(raw) => `${raw.category || "?"} — ${raw.amount || "0"}`}
        parseRow={(raw) => {
          if (!raw.category?.trim()) return { error: "category is required" };
          const amount = Number(raw.amount);
          if (!raw.amount || Number.isNaN(amount)) return { error: "amount must be a number" };
          return { data: { category: raw.category.trim(), amount, remark: raw.remark?.trim() || null } };
        }}
        createRow={(row) => expensesApi.create(row)}
        onImported={invalidateList}
      />
    </div>
  );
}
