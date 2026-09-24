const { CURRENCY_SYMBOL } = require("../../config/currencies");
const { money, formatDate, COLORS } = require("./invoiceDocument");

const { INK, MUTED, BORDER, PAID_COLOR, DUE_COLOR } = COLORS;

function statusBadgeColor(status) {
  if (status === "Active") return "#4338CA";
  if (status === "Cancelled") return MUTED;
  return INK;
}

// payload.lines: one row per rental/sale, pre-sorted newest first —
// { date, description, detail, status, total, paid, due } — `total`/`paid`/`due`
// are null for still-active rentals (not finalized until return).
function buildCustomerStatementDocDefinition(payload) {
  const { customer, company, lines, total_outstanding, generated_at } = payload;
  const logo = company.logo_data_uri || null;
  const symbol = CURRENCY_SYMBOL[company.currency] || "₹";

  const companyMetaLines = [
    company.address,
    [company.phone, company.email].filter(Boolean).join("   "),
    company.tax_id ? `Tax ID: ${company.tax_id}` : null,
  ].filter(Boolean);

  const tableBody = [
    [
      { text: "Date", style: "th" },
      { text: "Item", style: "th" },
      { text: "Status", style: "th" },
      { text: "Total", style: "th", alignment: "right" },
      { text: "Paid", style: "th", alignment: "right" },
      { text: "Due", style: "th", alignment: "right" },
    ],
    ...lines.map((line) => [
      { text: formatDate(line.date) || "-", style: "td" },
      { stack: [{ text: line.description, style: "itemName" }, line.detail ? { text: line.detail, style: "itemDetail" } : null].filter(Boolean) },
      { text: line.status, style: "td", color: statusBadgeColor(line.status) },
      { text: line.total !== null ? money(line.total, symbol) : "—", style: "td", alignment: "right" },
      { text: line.paid !== null ? money(line.paid, symbol) : "—", style: "td", alignment: "right" },
      {
        text: line.due !== null ? money(line.due, symbol) : "—",
        style: "td",
        alignment: "right",
        color: line.due > 0 ? DUE_COLOR : INK,
      },
    ]),
  ];

  const content = [
    {
      columns: [
        ...(logo ? [{ image: logo, width: 56, height: 56, fit: [56, 56] }] : []),
        {
          width: "*",
          margin: logo ? [12, 0, 0, 0] : [0, 0, 0, 0],
          stack: [{ text: company.name || "Account statement", style: "companyName" }, ...companyMetaLines.map((line) => ({ text: line, style: "meta" }))],
        },
        {
          width: "auto",
          alignment: "right",
          stack: [
            { text: "ACCOUNT STATEMENT", style: "invoiceTitle" },
            { text: `Generated ${formatDate(generated_at)}`, style: "meta" },
          ],
        },
      ],
    },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: INK }], margin: [0, 14, 0, 20] },

    { text: "CUSTOMER", style: "sectionLabel" },
    { text: customer.name, style: "customerName", margin: [0, 2, 0, 0] },
    customer.phone ? { text: customer.phone, style: "meta" } : null,
    customer.address ? { text: customer.address, style: "meta" } : null,

    lines.length === 0
      ? { text: "No rental or sale activity yet.", style: "meta", margin: [0, 24, 0, 0] }
      : {
          margin: [0, 24, 0, 0],
          table: { headerRows: 1, widths: ["auto", "*", "auto", 70, 70, 70], body: tableBody },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 1),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            fillColor: (rowIndex) => (rowIndex === 0 ? INK : null),
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6,
          },
        },

    {
      margin: [0, 20, 0, 0],
      columns: [
        { width: "*", text: "" },
        {
          width: 260,
          stack: [
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: 260, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 4, 0, 4] },
            {
              columns: [
                { text: total_outstanding > 0 ? "Total outstanding" : "Fully settled", style: "totalsLabelBold" },
                {
                  text: money(total_outstanding, symbol),
                  style: "totalsValueBold",
                  color: total_outstanding > 0 ? DUE_COLOR : PAID_COLOR,
                },
              ],
            },
          ],
        },
      ],
    },
  ].filter(Boolean);

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, company.footer_note ? 70 : 40],
    content,
    footer: company.footer_note ? { text: company.footer_note, style: "footerNote", margin: [40, 10, 40, 20] } : undefined,
    defaultStyle: { font: "Roboto", fontSize: 10, color: INK },
    styles: {
      companyName: { fontSize: 15, bold: true, color: INK },
      meta: { fontSize: 9, color: MUTED, margin: [0, 2, 0, 0] },
      invoiceTitle: { fontSize: 16, bold: true, color: INK },
      sectionLabel: { fontSize: 9, bold: true, color: MUTED, characterSpacing: 0.5 },
      customerName: { fontSize: 13, bold: true, color: INK },
      th: { fontSize: 9, bold: true, color: "white" },
      td: { fontSize: 9.5, color: INK },
      itemName: { fontSize: 9.5, bold: true, color: INK },
      itemDetail: { fontSize: 8, color: MUTED, margin: [0, 1, 0, 0] },
      totalsLabelBold: { fontSize: 12, bold: true, color: INK },
      totalsValueBold: { fontSize: 12, bold: true, alignment: "right" },
      footerNote: { fontSize: 8.5, color: MUTED, alignment: "center" },
    },
  };
}

module.exports = { buildCustomerStatementDocDefinition };
