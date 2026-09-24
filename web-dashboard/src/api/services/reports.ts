import { http } from "../http";
import type { DashboardReport, NetProfitReport, Rental, ReportSummary } from "../../types/models";

// The browser's offset from UTC in minutes, so "today" and "this month" are
// computed in the user's local time on the server.
const tz = () => -new Date().getTimezoneOffset();

export const reportsApi = {
  dashboard: () => http.get<DashboardReport>("/reports/dashboard", { params: { tz: tz() } }).then((r) => r.data),
  summary: (start_date: string, end_date: string) =>
    http.get<ReportSummary>("/reports/summary", { params: { start_date, end_date, tz: tz() } }).then((r) => r.data),
  daily: (start_date: string, end_date: string) =>
    http.get<{ rentals: Rental[]; money_received: number }>("/reports/daily", { params: { start_date, end_date, tz: tz() } }).then((r) => r.data),
  netProfit: (start_date: string, end_date: string) =>
    http.get<NetProfitReport>("/reports/net-profit", { params: { start_date, end_date } }).then((r) => r.data),
};
