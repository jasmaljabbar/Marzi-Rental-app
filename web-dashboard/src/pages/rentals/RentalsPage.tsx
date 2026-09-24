import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Download, FileText, ClipboardList } from "lucide-react";
import { rentalsApi, invoicesApi } from "../../api/services";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePermission } from "../../hooks/usePermission";
import { currency, formatDate, daysSince } from "../../utils/format";
import { exportToCsv } from "../../utils/export/csv";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Tabs } from "../../components/ui/Tabs";
import { SearchInput } from "../../components/ui/SearchInput";
import { DateRangePicker } from "../../components/ui/DateRangePicker";
import type { DateRange } from "../../components/ui/DateRangePicker";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorPanel } from "../../components/ui/QueryState";
import { Skeleton } from "../../components/ui/Skeleton";
import { CreateRentalModal } from "./CreateRentalModal";
import { ReturnModal } from "./ReturnModal";
import { EditActiveRentalModal, AddPaymentModal, CancelRentalModal } from "./RentalMiscModals";
import type { Rental } from "../../types/models";

const HISTORY_PAGE_SIZE = 25;

export function RentalsPage() {
  const canOperate = usePermission("rentals.operate");
  const [tab, setTab] = useState<"active" | "history">("active");
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [historyPage, setHistoryPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [returning, setReturning] = useState<Rental[] | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [payingRental, setPayingRental] = useState<Rental | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Rental | null>(null);

  const filters = { date_from: range.from ?? undefined, date_to: range.to ?? undefined, search: debouncedSearch || undefined };

  const active = useQuery({
    queryKey: ["rentals", "active", filters],
    queryFn: () => rentalsApi.list({ status: "Active", ...filters, page: 1, page_size: 500 }),
    placeholderData: keepPreviousData,
  });
  const history = useQuery({
    queryKey: ["rentals", "history", filters, historyPage],
    queryFn: () => rentalsApi.history({ include_cancelled: true, ...filters, page: historyPage, page_size: HISTORY_PAGE_SIZE }),
    placeholderData: keepPreviousData,
    enabled: tab === "history",
  });

  // Active rentals grouped by customer so a whole order can be returned at once.
  const groupedActive = useMemo(() => {
    const groups = new Map<string, Rental[]>();
    for (const r of active.data?.items ?? []) {
      const list = groups.get(r.customer_id) ?? [];
      list.push(r);
      groups.set(r.customer_id, list);
    }
    return Array.from(groups.values());
  }, [active.data]);

  function exportActive() {
    exportToCsv(
      "active-rentals.csv",
      (active.data?.items ?? []).map((r) => ({
        customer: r.customer?.name ?? "",
        phone: r.customer?.phone ?? "",
        equipment: r.equipment?.name ?? "",
        quantity: r.quantity,
        daily_rate: r.daily_rate ?? "",
        rented_at: formatDate(r.rented_at),
        expected_return: formatDate(r.expected_return_date),
        advance: r.advance_amount,
      })),
      [
        { key: "customer", label: "Customer" },
        { key: "phone", label: "Phone" },
        { key: "equipment", label: "Equipment" },
        { key: "quantity", label: "Qty" },
        { key: "daily_rate", label: "Rate/day" },
        { key: "rented_at", label: "Rented At" },
        { key: "expected_return", label: "Expected Return" },
        { key: "advance", label: "Advance" },
      ]
    );
  }

  function exportHistory() {
    exportToCsv(
      "rental-history.csv",
      (history.data?.items ?? []).map((r) => ({
        invoice: r.invoice_number ?? "",
        customer: r.customer?.name ?? "",
        equipment: r.equipment?.name ?? "",
        status: r.status,
        total: r.total_price,
        paid: r.advance_amount - (r.refund_amount || 0) + (r.amount_paid_on_return || 0),
        due: r.amount_due,
        returned_at: formatDate(r.returned_at),
      })),
      [
        { key: "invoice", label: "Invoice" },
        { key: "customer", label: "Customer" },
        { key: "equipment", label: "Equipment" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total" },
        { key: "paid", label: "Paid" },
        { key: "due", label: "Due" },
        { key: "returned_at", label: "Returned At" },
      ]
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rentals"
        description="Track what's out, take returns and collect payments."
        actions={
          <>
            <Button variant="secondary" onClick={tab === "active" ? exportActive : exportHistory}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
            {canOperate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New rental
              </Button>
            )}
          </>
        }
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              { key: "active", label: "Active", count: active.data?.total },
              { key: "history", label: "History", count: history.data?.total },
            ]}
            active={tab}
            onChange={(k) => setTab(k as "active" | "history")}
          />
          <SearchInput
            placeholder="Customer, phone, item or invoice"
            aria-label="Search rentals"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHistoryPage(1);
            }}
            className="w-full sm:w-72"
          />
        </div>

        <DateRangePicker
          value={range}
          onChange={(r) => {
            setRange(r);
            setHistoryPage(1);
          }}
        />

        {tab === "active" ? (
          active.isPending ? (
            <Skeleton lines={5} />
          ) : active.isError ? (
            <ErrorPanel error={active.error} onRetry={() => active.refetch()} />
          ) : groupedActive.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={debouncedSearch ? "No active rentals match" : "No active rentals"}
              description={debouncedSearch ? "Try a different search." : "Rentals you create will show up here until they're returned."}
              action={
                canOperate && !debouncedSearch ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    New rental
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {groupedActive.map((rentals) => {
                const customer = rentals[0].customer;
                return (
                  <section key={rentals[0].customer_id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800" aria-label={`Rentals for ${customer?.name ?? "customer"}`}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link to={`/customers/${rentals[0].customer_id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                          {customer?.name ?? "Unknown customer"}
                        </Link>
                        {customer?.phone && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{customer.phone}</span>}
                      </div>
                      {canOperate && rentals.length > 1 && (
                        <Button size="sm" variant="secondary" onClick={() => setReturning(rentals)}>
                          Return all ({rentals.length})
                        </Button>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {rentals.map((r) => {
                        const overdue = r.expected_return_date && new Date(r.expected_return_date) < new Date();
                        return (
                          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/70">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                              <Link to={`/equipment/${r.equipment_id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                                {r.equipment?.name ?? "Item"}
                              </Link>
                              <span className="text-slate-500 dark:text-slate-400">Qty {r.quantity}</span>
                              <span className="text-slate-500 dark:text-slate-400">
                                since {formatDate(r.rented_at)} ({daysSince(r.rented_at)}d)
                              </span>
                              {overdue && <Badge tone="red">Overdue</Badge>}
                            </div>
                            {canOperate && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditingRental(r)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setCancelTarget(r)}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={() => setReturning([r])}>
                                  Return
                                </Button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )
        ) : history.isPending ? (
          <Skeleton lines={6} />
        ) : history.isError ? (
          <ErrorPanel error={history.error} onRetry={() => history.refetch()} />
        ) : (history.data?.items.length ?? 0) === 0 ? (
          <EmptyState title={debouncedSearch ? "No rentals match" : "No rental history yet"} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-slate-500 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Invoice
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Customer
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Equipment
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">
                      Total
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">
                      Due
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.data!.items.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3 font-mono text-xs text-slate-500 dark:text-slate-400">{r.invoice_number ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <Link to={`/customers/${r.customer_id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                          {r.customer?.name ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{r.equipment?.name ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={r.status === "Cancelled" ? "neutral" : r.payment_status === "Paid" ? "emerald" : r.payment_status === "Partial" ? "amber" : "red"}>
                          {r.status === "Cancelled" ? "Cancelled" : r.payment_status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{currency(r.total_price)}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums ${r.amount_due > 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-400"}`}>
                        {currency(r.amount_due)}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === "Completed" && (
                            <Button size="sm" variant="ghost" onClick={() => invoicesApi.downloadPdf(r.id, r.invoice_number)} aria-label={`Download invoice ${r.invoice_number ?? ""}`}>
                              <FileText className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          {canOperate && r.status === "Completed" && r.amount_due > 0 && (
                            <Button size="sm" variant="secondary" onClick={() => setPayingRental(r)}>
                              Add payment
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={historyPage} totalPages={history.data?.totalPages ?? 1} total={history.data?.total ?? 0} pageSize={HISTORY_PAGE_SIZE} onPageChange={setHistoryPage} />
          </>
        )}
      </Card>

      <CreateRentalModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ReturnModal open={Boolean(returning)} onClose={() => setReturning(null)} rentals={returning ?? []} />
      <EditActiveRentalModal open={Boolean(editingRental)} onClose={() => setEditingRental(null)} rental={editingRental} />
      <AddPaymentModal open={Boolean(payingRental)} onClose={() => setPayingRental(null)} rental={payingRental} />
      <CancelRentalModal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} rental={cancelTarget} />
    </div>
  );
}
