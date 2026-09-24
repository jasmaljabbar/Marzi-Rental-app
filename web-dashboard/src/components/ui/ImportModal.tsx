import { useState } from "react";
import { UploadCloud, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { parseCsvFile, exportToCsv } from "../../utils/export/csv";
import { parseExcelFile } from "../../utils/export/xlsx";
import { useBulkOperation } from "../../hooks/useBulkOperation";
import { BulkResultDialog } from "./BulkResultDialog";

interface ParsedRow<Row> {
  raw: Record<string, string>;
  data: Row | null;
  error: string | null;
}

interface ImportModalProps<Row> {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Header row for the downloadable blank template. */
  templateColumns: string[];
  /** Validate + map one raw file row (keyed by header) into the create payload, or return an error. */
  parseRow: (raw: Record<string, string>) => { data: Row } | { error: string };
  /** Calls the resource's create endpoint for one row. */
  createRow: (row: Row) => Promise<unknown>;
  /** Short label for a row shown in the preview/results list. */
  rowLabel: (raw: Record<string, string>) => string;
  onImported: () => void;
}

// Generic bulk-import flow reused across Equipment/Customers/Expenses: no
// bulk-import backend endpoint exists for any of them, so this parses the
// file client-side, validates every row up front, and then runs sequential
// create calls (via useBulkOperation) only for the rows that pass.
export function ImportModal<Row>({
  open,
  onClose,
  title,
  templateColumns,
  parseRow,
  createRow,
  rowLabel,
  onImported,
}: ImportModalProps<Row>) {
  const [rows, setRows] = useState<Array<ParsedRow<Row>>>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const bulk = useBulkOperation<{ raw: Record<string, string>; data: Row }>();
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulk.run>> | null>(null);

  function reset() {
    setRows([]);
    setFileName(null);
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    try {
      const raws = file.name.toLowerCase().endsWith(".xlsx") ? await parseExcelFile(file) : await parseCsvFile(file);
      const parsed = raws.map((raw) => {
        const outcome = parseRow(raw);
        return "data" in outcome ? { raw, data: outcome.data, error: null } : { raw, data: null, error: outcome.error };
      });
      setRows(parsed);
      if (parsed.length === 0) toast.error("No rows found in that file.");
    } catch {
      toast.error("Couldn't read that file — make sure it's a valid CSV or .xlsx export.");
    }
  }

  const validRows = rows.filter(
    (r): r is { raw: Record<string, string>; data: Row; error: null } => r.data !== null
  );

  async function handleImport() {
    const outcome = await bulk.run(validRows, (row) => createRow(row.data));
    setResult(outcome);
    setResultOpen(true);
    if (outcome.failed.length === 0) {
      onClose();
      reset();
    }
    onImported();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          onClose();
          reset();
        }}
        title={title}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Upload a CSV or .xlsx file</p>
              <p className="text-xs text-slate-400">First row must be column headers: {templateColumns.join(", ")}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportToCsv("import-template.csv", [], templateColumns.map((c) => ({ key: c, label: c })))}
              >
                Download template
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  <UploadCloud className="h-4 w-4" />
                  Choose file
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          {fileName && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <strong>{fileName}</strong> — {rows.length} row{rows.length === 1 ? "" : "s"} found,{" "}
                <span className="text-emerald-600 dark:text-emerald-400">{validRows.length} valid</span>
                {rows.length - validRows.length > 0 && (
                  <span className="text-red-600 dark:text-red-400"> , {rows.length - validRows.length} invalid</span>
                )}
              </p>

              {rows.length > 0 && (
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                  {rows.map((row, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {row.error ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      )}
                      <span className={row.error ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}>
                        {rowLabel(row.raw)}
                        {row.error && ` — ${row.error}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                reset();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={validRows.length === 0} isLoading={bulk.isRunning}>
              Import {validRows.length} row{validRows.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </Modal>

      <BulkResultDialog open={resultOpen} onClose={() => setResultOpen(false)} result={result} itemLabel={(row) => rowLabel(row.raw)} />
    </>
  );
}
