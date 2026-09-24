const { CURRENCY_SYMBOL } = require("../../config/currencies");

const INK = "#16324f";
const MUTED = "#55708e";
const BORDER = "#dbe7f4";
const PAID_COLOR = "#059669";
const PARTIAL_COLOR = "#D97706";
const DUE_COLOR = "#B91C1C";

function money(value, symbol) {
  return `${symbol}${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusColor(paymentStatus) {
  if (paymentStatus === "Paid") return PAID_COLOR;
  if (paymentStatus === "Partial") return PARTIAL_COLOR;
  return DUE_COLOR;
}

function totalsRow(label, value, symbol, opts = {}) {
  const { bold = false, color = INK, prefix = "" } = opts;
  return {
    columns: [
      { text: label, style: bold ? "totalsLabelBold" : "totalsLabel" },
      { text: `${prefix}${money(value, symbol)}`, style: bold ? "totalsValueBold" : "totalsValue", color },
    ],
    margin: [0, bold ? 6 : 3, 0, bold ? 6 : 3],
  };
}

function buildInvoiceDocDefinition(payload) {
  const { invoice_number, issued_at, due_date, payment_status, rental, customer, company, charges } = payload;
  // The logo is resolved to a PNG data URI by the caller (pdfmake can't fetch URLs).
  const logo = company.logo_data_uri || null;
  const color = statusColor(payment_status);
  const symbol = CURRENCY_SYMBOL[company.currency] || "₹";

  const companyMetaLines = [
    company.address,
    [company.phone, company.email].filter(Boolean).join("   "),
    company.tax_id ? `Tax ID: ${company.tax_id}` : null,
  ].filter(Boolean);

  const content = [
    {
      columns: [
        ...(logo ? [{ image: logo, width: 56, height: 56, fit: [56, 56] }] : []),
        {
          width: "*",
          margin: logo ? [12, 0, 0, 0] : [0, 0, 0, 0],
          stack: [
            { text: company.name || "Invoice", style: "companyName" },
            ...companyMetaLines.map((line) => ({ text: line, style: "meta" })),
          ],
        },
        {
          width: "auto",
          alignment: "right",
          stack: [
            { text: "INVOICE", style: "invoiceTitle" },
            { text: `# ${invoice_number}`, style: "meta" },
            { text: `Issued ${formatDate(issued_at)}`, style: "meta" },
            due_date ? { text: `Due ${formatDate(due_date)}`, style: "meta" } : null,
            { text: payment_status.toUpperCase(), style: "statusBadge", color },
          ].filter(Boolean),
        },
      ],
    },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: INK }], margin: [0, 14, 0, 20] },

    { text: "BILLED TO", style: "sectionLabel" },
    { text: customer.name, style: "customerName", margin: [0, 2, 0, 0] },
    customer.phone ? { text: customer.phone, style: "meta" } : null,
    customer.address ? { text: customer.address, style: "meta" } : null,

    {
      margin: [0, 24, 0, 0],
      table: {
        headerRows: 1,
        widths: ["*", 50, 70, 80],
        body: [
          [
            { text: "Item", style: "th" },
            { text: "Qty", style: "th", alignment: "right" },
            { text: "Rate / day", style: "th", alignment: "right" },
            { text: "Amount", style: "th", alignment: "right" },
          ],
          [
            {
              stack: [
                { text: rental.equipment.name, style: "itemName" },
                { text: `${charges.days_rented} day(s) rented`, style: "itemDetail" },
              ],
            },
            { text: String(charges.quantity), style: "td", alignment: "right" },
            { text: money(charges.rent_per_day, symbol), style: "td", alignment: "right" },
            { text: money(charges.gross_amount, symbol), style: "td", alignment: "right" },
          ],
        ],
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 1),
        vLineWidth: () => 0,
        hLineColor: () => BORDER,
        fillColor: (rowIndex) => (rowIndex === 0 ? INK : null),
        paddingLeft: () => 10,
        paddingRight: () => 10,
        paddingTop: () => 8,
        paddingBottom: () => 8,
      },
    },

    {
      margin: [0, 20, 0, 0],
      columns: [
        { width: "*", text: "" },
        {
          width: 260,
          stack: [
            totalsRow("Gross amount", charges.gross_amount, symbol),
            charges.discount_amount > 0 ? totalsRow("Discount", charges.discount_amount, symbol, { prefix: "-" }) : null,
            charges.late_fee_amount > 0 ? totalsRow("Late fee", charges.late_fee_amount, symbol, { prefix: "+" }) : null,
            charges.damage_amount > 0 ? totalsRow("Damage", charges.damage_amount, symbol, { prefix: "+" }) : null,
            charges.tax_amount > 0
              ? totalsRow(`Tax (${charges.tax_rate_percent}%)`, charges.tax_amount, symbol, { prefix: "+" })
              : null,
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: 260, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 4, 0, 4] },
            totalsRow("Total", charges.total_amount, symbol, { bold: true }),
            charges.advance_amount > 0 ? totalsRow("Advance paid (deposit)", charges.advance_amount, symbol, { prefix: "-" }) : null,
            charges.amount_paid_on_return > 0
              ? totalsRow("Paid after advance", charges.amount_paid_on_return, symbol, { prefix: "-" })
              : null,
            charges.refund_amount > 0 ? totalsRow("Advance refunded", charges.refund_amount, symbol, { prefix: "+" }) : null,
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: 260, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 4, 0, 4] },
            totalsRow(charges.amount_due > 0 ? "Balance due" : "Paid in full", charges.amount_due, symbol, {
              bold: true,
              color: charges.amount_due > 0 ? DUE_COLOR : PAID_COLOR,
            }),
          ].filter(Boolean),
        },
      ],
    },
  ].filter(Boolean);

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, company.footer_note ? 70 : 40],
    content,
    footer: company.footer_note
      ? { text: company.footer_note, style: "footerNote", margin: [40, 10, 40, 20] }
      : undefined,
    defaultStyle: { font: "Roboto", fontSize: 10, color: INK },
    styles: {
      companyName: { fontSize: 15, bold: true, color: INK },
      meta: { fontSize: 9, color: MUTED, margin: [0, 2, 0, 0] },
      invoiceTitle: { fontSize: 20, bold: true, color: INK },
      statusBadge: { fontSize: 10, bold: true, margin: [0, 6, 0, 0] },
      sectionLabel: { fontSize: 9, bold: true, color: MUTED, characterSpacing: 0.5 },
      customerName: { fontSize: 13, bold: true, color: INK },
      th: { fontSize: 9, bold: true, color: "white" },
      td: { fontSize: 10, color: INK },
      itemName: { fontSize: 10, bold: true, color: INK },
      itemDetail: { fontSize: 8.5, color: MUTED, margin: [0, 2, 0, 0] },
      totalsLabel: { fontSize: 10, color: MUTED },
      totalsValue: { fontSize: 10, color: INK, alignment: "right" },
      totalsLabelBold: { fontSize: 12, bold: true, color: INK },
      totalsValueBold: { fontSize: 12, bold: true, alignment: "right" },
      footerNote: { fontSize: 8.5, color: MUTED, alignment: "center" },
    },
  };
}

module.exports = {
  buildInvoiceDocDefinition,
  // Exported for reuse by statementDocument.js — same branding/typography
  // should look consistent across every PDF this app generates.
  money,
  formatDate,
  COLORS: { INK, MUTED, BORDER, PAID_COLOR, PARTIAL_COLOR, DUE_COLOR },
};
