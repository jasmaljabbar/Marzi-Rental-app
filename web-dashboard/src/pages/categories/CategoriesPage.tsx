import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Archive, ArchiveRestore, Trash2, Pencil, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { categoriesApi, equipmentApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useBulkOperation } from "../../hooks/useBulkOperation";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { isOwnerOrAdmin } from "../../utils/permissions";
import { useAuth } from "../../context/AuthContext";
import { exportToCsv } from "../../utils/export/csv";
import { formatDate } from "../../utils/format";
import { categoryIcon } from "../../utils/categoryIcons";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyRow } from "../../components/ui/EmptyState";
import { LoadingRow } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Tabs } from "../../components/ui/Tabs";
import { BulkResultDialog } from "../../components/ui/BulkResultDialog";
import { CategoryIconPicker } from "../../components/CategoryIconPicker";
import type { Category } from "../../types/models";

interface SortableCategoryRowProps {
  category: Category;
  itemCount: number;
  canManage: boolean;
  canDrag: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function SortableCategoryRow({
  category,
  itemCount,
  canManage,
  canDrag,
  selected,
  onToggleSelect,
  onEdit,
  onArchive,
  onDelete,
}: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: !canDrag,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const Icon = categoryIcon(category.icon);

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
      {canManage && (
        <td className="w-10 px-4 py-2" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label="Select row" />
        </td>
      )}
      <td className="w-8 px-1 py-2 text-slate-400">
        {canDrag && (
          <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none active:cursor-grabbing" title="Drag to reorder">
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Icon className="h-4 w-4" />
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{category.name}</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <Badge tone={itemCount > 0 ? "indigo" : "neutral"}>
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </Badge>
      </td>
      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{formatDate(category.created_at)}</td>
      <td className="px-4 py-2">{category.is_archived ? <Badge tone="neutral">Archived</Badge> : <Badge tone="emerald">Active</Badge>}</td>
      {canManage && (
        <td className="px-4 py-2 text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onArchive} title={category.is_archived ? "Restore" : "Archive"}>
              {category.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  );
}

export function CategoriesPage() {
  const { user } = useAuth();
  const canManage = isOwnerOrAdmin(user?.role);
  const queryClient = useQueryClient();
  const { afterCategoryChange } = useInvalidate();

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [bulkResultOpen, setBulkResultOpen] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["categories", tab],
    queryFn: () => categoriesApi.list({ page: 1, page_size: 500, include_archived: tab === "archived" }),
  });
  // Item counts per category — computed client-side from the equipment
  // catalog rather than a dedicated backend aggregate, same approach as the
  // dashboard's fleet-utilization numbers.
  const { data: equipmentResult } = useQuery({
    queryKey: ["equipment", "for-category-counts"],
    queryFn: () => equipmentApi.list({ page: 1, page_size: 1000 }),
  });
  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of equipmentResult?.items ?? []) {
      if (e.is_archived) continue;
      counts.set(e.category_id, (counts.get(e.category_id) ?? 0) + 1);
    }
    return counts;
  }, [equipmentResult]);

  const categories = useMemo(() => {
    const items = data?.items ?? [];
    if (!debouncedSearch) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter((c) => c.name.toLowerCase().includes(q));
  }, [data, debouncedSearch]);

  // Local order mirrors the server's sort_order so dragging can reorder
  // instantly without waiting on a round-trip; resynced whenever the
  // underlying list changes (tab switch, refetch, create/delete).
  useEffect(() => {
    setOrderedIds(categories.map((c) => c.id));
  }, [categories]);

  const orderedCategories = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    return orderedIds.map((id) => byId.get(id)).filter((c): c is Category => Boolean(c));
  }, [orderedIds, categories]);

  const canDrag = canManage && tab === "active" && !debouncedSearch;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => categoriesApi.reorder(ids),
    onError: (err) => {
      toast.error(apiErrorMessage(err).detail);
      setOrderedIds(categories.map((c) => c.id));
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedIds((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      const next = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate(next);
      return next;
    });
  }

  function invalidateList() {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    afterCategoryChange();
  }

  function openAdd() {
    setEditing(null);
    setFormName("");
    setFormIcon(null);
    setFormOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setFormName(c.name);
    setFormIcon(c.icon);
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? categoriesApi.update(editing.id, { name: formName.trim(), icon: formIcon }) : categoriesApi.create(formName.trim(), formIcon),
    onSuccess: () => {
      toast.success(editing ? "Category updated." : "Category created.");
      setFormOpen(false);
      invalidateList();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const archiveMutation = useMutation({
    mutationFn: (c: Category) => (c.is_archived ? categoriesApi.restore(c.id) : categoriesApi.archive(c.id)),
    onSuccess: (_, c) => {
      toast.success(c.is_archived ? "Category restored." : "Category archived.");
      invalidateList();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success("Category deleted.");
      setDeleteTarget(null);
      invalidateList();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const bulk = useBulkOperation<Category>();
  const [bulkResult, setBulkResult] = useState<Awaited<ReturnType<typeof bulk.run>> | null>(null);

  async function handleBulkArchive() {
    const items = categories.filter((c) => selected.has(c.id));
    const result = await bulk.run(items, (c) => (tab === "archived" ? categoriesApi.restore(c.id) : categoriesApi.archive(c.id)));
    setBulkResult(result);
    setBulkResultOpen(true);
    setSelected(new Set());
    invalidateList();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === categories.length ? new Set() : new Set(categories.map((c) => c.id))));
  }

  function handleExport() {
    exportToCsv(
      `categories-${tab}.csv`,
      categories.map((c) => ({
        name: c.name,
        items: itemCounts.get(c.id) ?? 0,
        status: c.is_archived ? "Archived" : "Active",
        created_at: formatDate(c.created_at),
      })),
      [
        { key: "name", label: "Name" },
        { key: "items", label: "Items" },
        { key: "status", label: "Status" },
        { key: "created_at", label: "Created" },
      ]
    );
  }

  const allSelected = canManage && categories.length > 0 && categories.every((c) => selected.has(c.id));
  const colSpan = 5 + (canManage ? 2 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Categories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Master data used to classify equipment.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {canManage && (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add category
            </Button>
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
              setSelected(new Set());
            }}
          />
          <SearchInput placeholder="Search categories" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        </div>

        {canManage && selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300">
            {selected.size} selected
            <Button size="sm" variant="secondary" onClick={handleBulkArchive} isLoading={bulk.isRunning}>
              {tab === "archived" ? "Restore selected" : "Archive selected"}
            </Button>
          </div>
        )}

        {tab === "active" && !debouncedSearch && canManage && orderedCategories.length > 1 && (
          <p className="text-xs text-slate-400">Drag the handle to reorder categories. Clear the search box first if reordering looks disabled.</p>
        )}

        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  {canManage && (
                    <th className="w-10 px-4 py-2">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all rows" />
                    </th>
                  )}
                  <th className="w-8 px-1 py-2" />
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  {canManage && <th className="px-4 py-2 text-right font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {isLoading && <LoadingRow colSpan={colSpan} />}
                {!isLoading && orderedCategories.length === 0 && (
                  <EmptyRow
                    colSpan={colSpan}
                    title={tab === "archived" ? "No archived categories" : "No categories yet"}
                    description={tab === "active" ? "Add your first category to start organizing equipment." : undefined}
                  />
                )}
                {!isLoading && orderedCategories.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                      {orderedCategories.map((c) => (
                        <SortableCategoryRow
                          key={c.id}
                          category={c}
                          itemCount={itemCounts.get(c.id) ?? 0}
                          canManage={canManage}
                          canDrag={canDrag}
                          selected={selected.has(c.id)}
                          onToggleSelect={() => toggleSelect(c.id)}
                          onEdit={() => openEdit(c)}
                          onArchive={() => archiveMutation.mutate(c)}
                          onDelete={() => setDeleteTarget(c)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit category" : "Add category"} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (formName.trim()) saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input label="Category name" value={formName} onChange={(e) => setFormName(e.target.value)} required autoFocus />
          <CategoryIconPicker value={formIcon} onChange={setFormIcon} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {editing ? "Save changes" : "Add category"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete category"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone. Consider archiving instead if you might need it again.`}
        confirmLabel="Delete"
        danger
        isLoading={deleteMutation.isPending}
      />

      <BulkResultDialog open={bulkResultOpen} onClose={() => setBulkResultOpen(false)} result={bulkResult} itemLabel={(c) => c.name} />
    </div>
  );
}
