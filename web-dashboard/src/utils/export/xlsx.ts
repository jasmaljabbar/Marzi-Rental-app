import type { ExportColumn } from "./csv";

function downloadBuffer(buffer: ArrayBuffer | Uint8Array<ArrayBufferLike>, filename: string) {
  // ExcelJS's writeBuffer() return type can be backed by a SharedArrayBuffer per
  // its TS types, which Blob's constructor doesn't accept — copy the bytes into
  // a fresh plain ArrayBuffer first, which always satisfies BlobPart.
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const copy = new ArrayBuffer(view.byteLength);
  new Uint8Array(copy).set(view);
  const blob = new Blob([copy], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Array<Record<string, unknown>>,
  columns?: Array<ExportColumn & { width?: number }>
) {
  // exceljs is large, so it's only downloaded when someone actually exports.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  const cols: Array<ExportColumn & { width?: number }> = columns ?? (rows[0] ? Object.keys(rows[0]).map((key) => ({ key, label: key })) : []);
  sheet.columns = cols.map((c) => ({ header: c.label, key: c.key, width: c.width ?? 18 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}

// Reads the first sheet of an uploaded .xlsx file into plain objects keyed
// by header row, for the client-side bulk-import flow.
export async function parseExcelFile(file: File): Promise<Array<Record<string, string>>> {
  // exceljs is large, so it's only downloaded when someone actually exports.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const rows: Array<Record<string, string>> = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (key) record[key] = cell.value === null || cell.value === undefined ? "" : String(cell.value);
    });
    rows.push(record);
  });
  return rows;
}
