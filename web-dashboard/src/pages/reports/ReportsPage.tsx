import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, parseISO, format } from "date-fns";
import { TrendingUp, TrendingDown, Wallet, Tag, Download, Printer, Trophy, Users } from "lucide-react";
import { equipmentApi, reportsApi } from "../../api/services";
import { currency, formatDate } from "../../utils/format";
import { exportToCsv } from "../../utils/export/csv";
import { exportToExcel } from "../../utils/export/xlsx";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DateRangePicker } from "../../components/ui/DateRangePicker";
import type { DateRange } from "../../components/ui/DateRangePicker";
import { CategoryBreakdownChart } from "../../components/charts/CategoryBreakdownChart";
import { IncomeVsExpenseChart } from "../../components/charts/IncomeVsExpenseChart";
import { DailyRentalReport } from "./DailyRentalReport";
import { ErrorPanel } from "../../components/ui/QueryState";

const toIso = (d: string) => `${d}T00:00:00`;

export function ReportsPage() {
  const [range, setRange] = useState<DateRange>(() => ({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  }));

  // Memoized so these stay referentially stable within a render pass — the
  // query keys below need to stabilize, not recompute to a fresh millisecond
  // value every time.
  const start = useMemo(() => (range.from ? new Date(toIso(range.from)) : startOfMonth(new Date())), [range.from]);
  const end = useMemo(() => {
    const base = range.to ? new Date(toIso(range.to)) : new Date();
    // End-of-day so "today" (or any end date) fully counts, not just its midnight instant.
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
  }, [range.to]);
  const startIso = useMemo(() => start.toISOString(), [start]);
  const endIso = useMemo(() => end.toISOString(), [end]);
  const rangeLabel = `${formatDate(startIso)} – ${formatDate(endIso)}`;

  const summary = useQuery({ queryKey: ["reports", "summary", startIso, endIso], queryFn: () => reportsApi.summary(startIso, endIso) });
  const { data: salesSummaryRange } = useQuery({
    queryKey: ["equipment-sales", "summary", startIso, endIso],
    queryFn: () => equipmentApi.salesSummary(startIso, endIso),
  });
  const { data: salesSummaryLifetime } = useQuery({
    queryKey: ["equipment-sales", "summary", "lifetime"],
    queryFn: () => equipmentApi.salesSummary(),
  });
  // Needs the advancedReports plan feature; the section hides when unavailable.
  const { data: netProfitReport } = useQuery({
    queryKey: ["reports", "net-profit", startIso, endIso],
    queryFn: () => reportsApi.netProfit(startIso, endIso),
  });

  const s = summary.data;
  const moneyReceivedInRange = s?.money_received ?? 0;
  const expensesInRange = s?.expenses ?? 0;
  const netCashInRange = s?.net_cash ?? 0;
  const netProfitAllTime = s?.net_all_time ?? 0;
  const completedCount = s?.completed_count ?? 0;
  const cancelledCount = s?.cancelled_count ?? 0;
  const grossAllTime = s?.gross_all_time ?? 0;
  const collectionRate = s?.collection_rate ?? 100;
  const trendIsMonthly = s?.bucket === "month";
  const trend = useMemo(
    () =>
      (s?.trend ?? []).map((t) => ({
        label: format(parseISO(t.bucket.length === 7 ? `${t.bucket}-01` : t.bucket), trendIsMonthly ? "MMM yyyy" : "MMM d"),
        income: t.income,
        expense: t.expense,
      })),
    [s?.trend, trendIsMonthly]
  );
  const expenseBreakdown = s?.expense_breakdown ?? [];
  const revenueByCategory = s?.revenue_by_category ?? [];
  const topEquipment = s?.top_equipment ?? [];
  const topCustomers = s?.top_customers ?? [];

  function buildExportRows() {
    const rows: Array<{ section: string; label: string; value: string }> = [];
    rows.push({ section: "Summary", label: "Date range", value: rangeLabel });
    rows.push({ section: "Summary", label: "Revenue (cash, in range)", value: String(moneyReceivedInRange) });
    rows.push({ section: "Summary", label: "Expenses (in range)", value: String(expensesInRange) });
    rows.push({ section: "Summary", label: "Net (cash, in range)", value: String(netCashInRange) });
    if (netProfitReport) {
      rows.push({ section: "Summary", label: "Revenue (depreciation basis)", value: String(netProfitReport.revenue) });
      rows.push({ section: "Summary", label: "Operating expenses", value: String(netProfitReport.operating_expenses) });
      rows.push({ section: "Summary", label: "Depreciation", value: String(netProfitReport.depreciation_expense) });
      rows.push({ section: "Summary", label: "Net profit (depreciation basis)", value: String(netProfitReport.net_profit) });
    }
    revenueByCategory.forEach((r) => rows.push({ section: "Revenue by category", label: r.category, value: String(r.amount) }));
    expenseBreakdown.forEach((r) => rows.push({ section: "Expense by category", label: r.category, value: String(r.amount) }));
    topEquipment.forEach((r) => rows.push({ section: "Top equipment (revenue)", label: r.equipment_name, value: String(r.revenue) }));
    topCustomers.forEach((r) => rows.push({ section: "Top customers (revenue)", label: r.customer_name, value: String(r.revenue) }));
    return rows;
  }
  const EXPORT_COLUMNS = [
    { key: "section", label: "Section" },
    { key: "label", label: "Label" },
    { key: "value", label: "Value" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Revenue, expenses, and profitability.</p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="secondary" onClick={() => exportToCsv(`reports-${range.from}-to-${range.to}.csv`, buildExportRows(), EXPORT_COLUMNS)}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => exportToExcel(`reports-${range.from}-to-${range.to}.xlsx`, "Report", buildExportRows(), EXPORT_COLUMNS)}>
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {summary.isError && (
        <Card>
          <ErrorPanel error={summary.error} onRetry={() => summary.refetch()} />
        </Card>
      )}

      <Card aria-busy={summary.isPending}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {netProfitAllTime >= 0 ? <TrendingUp className="h-6 w-6 text-emerald-500" /> : <TrendingDown className="h-6 w-6 text-red-500" />}
            <div>
              <p className="text-xs text-slate-400">Net profit / loss (all-time, cash basis)</p>
              <p className={`text-2xl font-bold ${netProfitAllTime >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {currency(netProfitAllTime)}
              </p>
            </div>
          </div>
          <Badge tone={netProfitAllTime >= 0 ? "emerald" : "red"}>{netProfitAllTime >= 0 ? "Profit is positive" : "Expenses are ahead of revenue"}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Completed rentals" value={completedCount} />
          <StatCard label="Cancelled rentals" value={cancelledCount} />
          <StatCard label="Collection rate" value={`${collectionRate}%`} />
          <StatCard label="Gross rental (completed)" value={currency(grossAllTime)} />
        </div>
      </Card>

      <div className="no-print">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Wallet className="h-4 w-4" />
            Money received ({rangeLabel})
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Revenue" value={currency(moneyReceivedInRange)} />
            <StatCard label="Expenses" value={currency(expensesInRange)} />
            <StatCard label="Net" value={currency(netCashInRange)} tone={netCashInRange >= 0 ? "emerald" : "red"} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Tag className="h-4 w-4" />
            Equipment sales ({rangeLabel})
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Revenue" value={currency(salesSummaryRange?.total_revenue ?? 0)} />
            <StatCard label="Units sold" value={salesSummaryRange?.units_sold ?? 0} />
            <StatCard
              label="Gain / loss"
              value={currency(salesSummaryRange?.total_gain_loss ?? 0)}
              tone={(salesSummaryRange?.total_gain_loss ?? 0) >= 0 ? "emerald" : "red"}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Lifetime: {currency(salesSummaryLifetime?.total_revenue ?? 0)} revenue, {currency(salesSummaryLifetime?.total_gain_loss ?? 0)} gain/loss
          </p>
        </Card>
      </div>

      {trend.length > 0 && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Income vs expense trend</h2>
          <p className="mb-3 text-xs text-slate-400">Cash-basis, bucketed by {trendIsMonthly ? "month" : "day"} across {rangeLabel}.</p>
          <IncomeVsExpenseChart data={trend} />
        </Card>
      )}

      {netProfitReport && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Net profit (depreciation basis)</h2>
          <p className="mb-3 text-xs text-slate-400">
            Spreads equipment/stock purchase cost over each item's useful life instead of expensing it immediately — a more accurate long-run profit
            measure than the cash-basis figure above.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Revenue" value={currency(netProfitReport.revenue)} />
            <StatCard label="Operating expenses" value={currency(netProfitReport.operating_expenses)} />
            <StatCard label="Depreciation" value={currency(netProfitReport.depreciation_expense)} />
            <StatCard label="Net profit" value={currency(netProfitReport.net_profit)} tone={netProfitReport.net_profit >= 0 ? "emerald" : "red"} />
          </div>
          {netProfitReport.net_profit_by_equipment.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Net profit by equipment</h3>
              <p className="mb-2 text-xs text-slate-400">Least profitable first — the quickest way to spot an unprofitable machine.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-1.5 pr-3 font-medium">Equipment</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Revenue</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Expenses</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Depreciation</th>
                      <th className="py-1.5 font-medium text-right">Net profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {netProfitReport.net_profit_by_equipment.map((row) => (
                      <tr key={row.equipment_id}>
                        <td className="py-1.5 pr-3">
                          <Link to={`/equipment/${row.equipment_id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                            {row.equipment_name}
                          </Link>
                        </td>
                        <td className="py-1.5 pr-3 text-right text-slate-700 dark:text-slate-300">{currency(row.revenue)}</td>
                        <td className="py-1.5 pr-3 text-right text-slate-700 dark:text-slate-300">{currency(row.operating_expenses)}</td>
                        <td className="py-1.5 pr-3 text-right text-slate-700 dark:text-slate-300">{currency(row.depreciation)}</td>
                        <td className={`py-1.5 text-right font-semibold ${row.net_profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {currency(row.net_profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {revenueByCategory.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Revenue by equipment category</h2>
            <CategoryBreakdownChart data={revenueByCategory} />
          </Card>
        )}

        {expenseBreakdown.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Expense breakdown</h2>
            <CategoryBreakdownChart data={expenseBreakdown} />
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Trophy className="h-4 w-4" />
            Top rented equipment ({rangeLabel})
          </h2>
          {topEquipment.length === 0 ? (
            <p className="text-sm text-slate-400">No rental activity in this range.</p>
          ) : (
            <div className="space-y-1.5">
              {topEquipment.map((row, i) => (
                <div key={row.equipment_id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-800">
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-xs text-slate-400">{i + 1}</span>
                    <Link to={`/equipment/${row.equipment_id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      {row.equipment_name}
                    </Link>
                    <span className="text-xs text-slate-400">
                      {row.count} rental{row.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{currency(row.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Users className="h-4 w-4" />
            Top customers by revenue ({rangeLabel})
          </h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-slate-400">No rental activity in this range.</p>
          ) : (
            <div className="space-y-1.5">
              {topCustomers.map((row, i) => (
                <div key={row.customer_id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-800">
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-xs text-slate-400">{i + 1}</span>
                    <Link to={`/customers/${row.customer_id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      {row.customer_name}
                    </Link>
                    <span className="text-xs text-slate-400">
                      {row.count} rental{row.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{currency(row.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <DailyRentalReport />
    </div>
  );
}
