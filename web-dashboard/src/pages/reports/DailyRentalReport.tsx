import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, FileDown, FileSpreadsheet } from "lucide-react";
import { reportsApi } from "../../api/services";
import { exportToPdf } from "../../utils/export/pdf";
import { exportToExcel } from "../../utils/export/xlsx";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

interface ReportRow {
  date: string;
  item: string;
  customer: string;
  phone: string;
  paymentStatus: string;
  returnStatus: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyRentalReport() {
  const [date, setDate] = useState(todayIso());

  // Local midnight to midnight for the chosen day, computed on the server.
  const [startIso, endIso] = useMemo(() => {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return [start.toISOString(), end.toISOString()];
  }, [date]);
  const { data } = useQuery({ queryKey: ["reports", "daily", startIso], queryFn: () => reportsApi.daily(startIso, endIso) });

  const rows: ReportRow[] = useMemo(
    () =>
      (data?.rentals ?? []).map((r) => ({
        date,
        item: r.equipment?.name ?? "Item",
        customer: r.customer?.name ?? "Unknown",
        phone: r.customer?.phone ?? "",
        paymentStatus: r.status === "Active" ? "—" : r.payment_status === "Paid" ? "Paid" : r.payment_status === "Partial" ? "Part paid" : "Not paid",
        returnStatus: r.status === "Cancelled" ? "Cancelled" : r.status === "Completed" ? "Returned" : "Not returned",
      })),
    [data, date]
  );

  const columns = ["Date", "Item Rented", "Customer Name", "Phone Number", "Payment Status", "Return Status"];

  function handleExportExcel() {
    exportToExcel(
      `daily-rental-report-${date}.xlsx`,
      "Daily Rentals",
      rows.map((r) => ({ ...r })),
      [
        { key: "date", label: "Date" },
        { key: "item", label: "Item Rented" },
        { key: "customer", label: "Customer Name" },
        { key: "phone", label: "Phone Number" },
        { key: "paymentStatus", label: "Payment Status" },
        { key: "returnStatus", label: "Return Status" },
      ]
    );
  }

  function handleExportPdf() {
    exportToPdf(
      `daily-rental-report-${date}.pdf`,
      `Daily Rental Report — ${date}`,
      columns,
      rows.map((r) => [r.date, r.item, r.customer, r.phone, r.paymentStatus, r.returnStatus])
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 no-print">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daily rental report</h2>
          <p className="text-xs text-slate-400">Rentals started or returned on the selected date.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="secondary" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500 dark:text-slate-400">
            <tr>
              {columns.map((c) => (
                <th key={c} className="py-1.5 pr-3 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No rental activity on this date.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3">{r.date}</td>
                  <td className="py-1.5 pr-3">{r.item}</td>
                  <td className="py-1.5 pr-3">{r.customer}</td>
                  <td className="py-1.5 pr-3">{r.phone}</td>
                  <td className="py-1.5 pr-3">
                    <Badge tone={r.paymentStatus === "Paid" ? "emerald" : "amber"}>{r.paymentStatus}</Badge>
                  </td>
                  <td className="py-1.5 pr-3">
                    <Badge tone={r.returnStatus === "Returned" ? "emerald" : r.returnStatus === "Cancelled" ? "neutral" : "amber"}>{r.returnStatus}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
