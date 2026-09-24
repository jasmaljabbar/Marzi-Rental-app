import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Archive, ArchiveRestore, FileText, MessageCircle, FileDown, Download } from "lucide-react";
import { customersApi, rentalsApi, equipmentApi, invoicesApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { isOwnerOrAdmin } from "../../utils/permissions";
import { useAuth } from "../../context/AuthContext";
import { currency, daysSince } from "../../utils/format";
import { waLink } from "../../utils/whatsapp";
import { RISK_LABELS, RISK_TONES } from "../../utils/customerRisk";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ErrorPanel } from "../../components/ui/QueryState";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { CustomerFormModal } from "./CustomerFormModal";
import { ReturnModal } from "../rentals/ReturnModal";
import { Img } from "../../components/ui/Img";
import { Avatar } from "../../components/ui/Avatar";
import type { EquipmentSale } from "../../types/models";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = isOwnerOrAdmin(user?.role);
  const { afterCustomerChange } = useInvalidate();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [docViewer, setDocViewer] = useState<string | null>(null);
  const [returningRentalId, setReturningRentalId] = useState<string | null>(null);
  const [batchReturnOpen, setBatchReturnOpen] = useState(false);
  const [payingSale, setPayingSale] = useState<EquipmentSale | null>(null);
  const [salePayAmount, setSalePayAmount] = useState("0");

  const customerQuery = useQuery({ queryKey: ["customers", "detail", id], queryFn: () => customersApi.get(id!), enabled: Boolean(id) });
  const customer = customerQuery.data;

  const { data: activeRentals } = useQuery({
    queryKey: ["rentals", "active", "customer", id],
    queryFn: () => rentalsApi.list({ status: "Active", customer_id: id, page: 1, page_size: 200 }),
    enabled: Boolean(id),
  });
  const { data: rentalHistory } = useQuery({
    queryKey: ["rentals", "history", "customer", id],
    queryFn: () => rentalsApi.history({ include_cancelled: true, customer_id: id, page: 1, page_size: 200 }),
    enabled: Boolean(id),
  });
  const { data: sales } = useQuery({
    queryKey: ["equipment-sales", "customer", id],
    queryFn: () => equipmentApi.sales({ customer_id: id, page: 1, page_size: 100 }),
    enabled: Boolean(id),
  });

  const ongoing = useMemo(() => (activeRentals?.items ?? []).filter((r) => r.customer_id === id), [activeRentals, id]);
  const history = useMemo(
    () =>
      (rentalHistory?.items ?? [])
        .filter((r) => r.customer_id === id)
        .sort((a, b) => (b.amount_due || 0) - (a.amount_due || 0)),
    [rentalHistory, id]
  );
  const saleDues = (sales?.items ?? []).filter((s) => s.amount_due > 0);
  const totalPending = history.reduce((sum, r) => sum + (r.amount_due || 0), 0) + saleDues.reduce((sum, s) => sum + s.amount_due, 0);
  const risk = customer?.stats?.risk ?? "low-risk";

  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [statementDownloading, setStatementDownloading] = useState(false);

  async function downloadInvoice(rentalId: string, invoiceNumber: string | null) {
    setDownloadingInvoiceId(rentalId);
    try {
      await invoicesApi.downloadPdf(rentalId, invoiceNumber);
    } catch (err) {
      toast.error(apiErrorMessage(err).detail);
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  async function downloadStatement() {
    setStatementDownloading(true);
    try {
      await customersApi.downloadStatement(customer!.id, customer!.name);
    } catch (err) {
      toast.error(apiErrorMessage(err).detail);
    } finally {
      setStatementDownloading(false);
    }
  }

  const archiveMutation = useMutation({
    mutationFn: () => (customer!.is_archived ? customersApi.restore(customer!.id) : customersApi.archive(customer!.id)),
    onSuccess: () => {
      toast.success(customer!.is_archived ? "Restored." : "Archived.");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      afterCustomerChange();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.remove(customer!.id),
    onSuccess: () => {
      toast.success("Deleted.");
      afterCustomerChange();
      navigate("/customers");
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  const salePaymentMutation = useMutation({
    mutationFn: () => equipmentApi.updateSalePayment(payingSale!.id, Number(salePayAmount) || 0),
    onSuccess: () => {
      toast.success("Payment recorded.");
      queryClient.invalidateQueries({ queryKey: ["equipment-sales"] });
      setPayingSale(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (customerQuery.isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (!customer) return <ErrorPanel error={customerQuery.error} onRetry={() => customerQuery.refetch()} />;

  const returningRental = ongoing.find((r) => r.id === returningRentalId) ?? null;

  return (
    <div className="space-y-4">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        <ArrowLeft className="h-4 w-4" />
        All customers
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <Avatar src={customer.photo_thumb_url} fallbackSrc={customer.photo_url} name={customer.name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{customer.name}</h1>
                {customer.is_archived && <Badge tone="neutral">Archived</Badge>}
                <Badge tone={RISK_TONES[risk]}>{RISK_LABELS[risk]}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <span>{customer.phone}</span>
                <a
                  href={waLink(customer.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Message on WhatsApp"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
              {customer.address && <p className="text-sm text-slate-500 dark:text-slate-400">{customer.address}</p>}
              {customer.doc_url && (
                <button
                  type="button"
                  onClick={() => setDocViewer(customer.doc_url)}
                  className="mt-1 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <FileText className="h-4 w-4" />
                  View document
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={downloadStatement} isLoading={statementDownloading}>
              <FileDown className="h-4 w-4" />
              Download statement
            </Button>
            {canManage && (
              <>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="secondary" size="sm" onClick={() => archiveMutation.mutate()} isLoading={archiveMutation.isPending}>
                {customer.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {customer.is_archived ? "Restore" : "Archive"}
              </Button>
              <Button variant="danger-outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <Stat label="Ongoing" value={ongoing.length} />
          <Stat label="History" value={history.length} />
          <Stat label="Pending" value={currency(totalPending)} tone={totalPending > 0 ? "amber" : undefined} />
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ongoing rentals ({ongoing.length})</h2>
          {ongoing.length > 1 && (
            <Button size="sm" variant="secondary" onClick={() => setBatchReturnOpen(true)}>
              Return all
            </Button>
          )}
        </div>
        {ongoing.length === 0 ? (
          <EmptyState title="No active rentals" />
        ) : (
          <div className="space-y-1.5">
            {ongoing.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                <span className="text-slate-700 dark:text-slate-200">
                  <Link to={`/equipment/${r.equipment_id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                    {r.equipment?.name ?? "Item"}
                  </Link>{" "}
                  × {r.quantity} · {daysSince(r.rented_at)}d
                </span>
                <Button size="sm" onClick={() => setReturningRentalId(r.id)}>
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
          <EmptyState title="No rental history" />
        ) : (
          <div className="space-y-1.5">
            {history.slice(0, 20).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-200">
                  <Link to={`/equipment/${r.equipment_id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                    {r.equipment?.name ?? "Item"}
                  </Link>{" "}
                  · <Badge tone={r.status === "Completed" ? "emerald" : "neutral"}>{r.status}</Badge>
                </span>
                <div className="flex items-center gap-3">
                  <span className={r.amount_due > 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-400"}>
                    {currency(r.amount_due)} due
                  </span>
                  {r.status === "Completed" && (
                    <button
                      type="button"
                      onClick={() => downloadInvoice(r.id, r.invoice_number)}
                      disabled={downloadingInvoiceId === r.id}
                      title="Download invoice PDF"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 dark:hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {saleDues.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Equipment sale dues</h2>
          <div className="space-y-1.5">
            {saleDues.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/40">
                <span className="text-slate-700 dark:text-slate-200">
                  <Link to={`/equipment/${s.equipment_id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                    {s.equipment?.name ?? "Item"}
                  </Link>{" "}
                  × {s.quantity} — due {currency(s.amount_due)}
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setPayingSale(s);
                    setSalePayAmount(String(s.amount_due));
                  }}
                >
                  Update payment
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />

      <ReturnModal open={Boolean(returningRental)} onClose={() => setReturningRentalId(null)} rentals={returningRental ? [returningRental] : []} />
      <ReturnModal open={batchReturnOpen} onClose={() => setBatchReturnOpen(false)} rentals={ongoing} />

      <Modal open={Boolean(docViewer)} onClose={() => setDocViewer(null)} title="Document" size="lg">
        {docViewer && <Img src={docViewer} alt="Customer ID document" className="w-full rounded-md" />}
      </Modal>

      <Modal open={Boolean(payingSale)} onClose={() => setPayingSale(null)} title="Update sale payment" size="sm">
        <div className="space-y-3">
          <Input label="Amount paid" type="number" min={0} step="0.01" value={salePayAmount} onChange={(e) => setSalePayAmount(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPayingSale(null)}>
              Cancel
            </Button>
            <Button onClick={() => salePaymentMutation.mutate()} isLoading={salePaymentMutation.isPending}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete customer"
        description={`Permanently delete "${customer.name}"? This cannot be undone.`}
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
