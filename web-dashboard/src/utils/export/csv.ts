export interface ExportColumn {
  key: string;
  label: string;
}

function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function exportToCsv(filename: string, rows: Array<Record<string, unknown>>, columns?: ExportColumn[]) {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]).map((key) => ({ key, label: key })) : []);
  const header = cols.map((c) => escapeCsvField(c.label)).join(",");
  const lines = rows.map((row) => cols.map((c) => escapeCsvField(row[c.key])).join(","));
  downloadBlob([header, ...lines].join("\r\n"), filename, "text/csv;charset=utf-8;");
}

// Minimal RFC4180-ish CSV parser (quoted fields, escaped quotes, CRLF/LF) —
// good enough for round-tripping our own exports and typical spreadsheet CSVs.
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function parseCsvText(text: string): Array<Record<string, string>> {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell !== ""))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = row[i] ?? "";
      });
      return record;
    });
}

export function parseCsvFile(file: File): Promise<Array<Record<string, string>>> {
  return file.text().then(parseCsvText);
}
