
// Reserved for the "downloadable without a print dialog" case. The Daily
// Rental Report's primary export path is a clean HTML view + window.print()
// (near-zero cost, works for any report), this is the alternative when a
// direct file download is specifically requested.
export async function exportToPdf(filename: string, title: string, columns: string[], rows: Array<Array<string | number>>) {
  // jspdf is large, so it's only downloaded when someone actually exports.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(new Date().toLocaleString(), 14, 22);

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 27,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
}
