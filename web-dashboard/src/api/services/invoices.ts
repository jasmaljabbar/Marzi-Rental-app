import { http } from "../http";
import { downloadAuthenticatedFile } from "../../utils/downloadFile";
import type { Id, PaymentStatus } from "../../types/models";

export interface InvoiceListItem {
  rental_id: Id;
  order_id: string | null;
  invoice_number: string | null;
  issued_at: string | null;
  due_date: string | null;
  customer: { id: Id; name: string; phone: string } | null;
  equipment_name: string | null;
  quantity: number;
  total_amount: number;
  amount_due: number;
  payment_status: PaymentStatus;
}

export interface ListInvoicesParams {
  customer_id?: Id;
  payment_status?: PaymentStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export const invoicesApi = {
  list: (params: ListInvoicesParams = {}) => http.get<InvoiceListItem[]>("/invoices", { params }).then((r) => r.data),
  downloadPdf: (rentalId: Id, invoiceNumber?: string | null) =>
    downloadAuthenticatedFile(`/invoices/${rentalId}/pdf`, `${invoiceNumber || rentalId}.pdf`),
};
