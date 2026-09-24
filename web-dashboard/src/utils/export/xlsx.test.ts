import { describe, expect, it } from "vitest";

describe("Excel export library", () => {
  it("still builds a workbook with the patched uuid dependency", async () => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Report").addRow(["a", 1]);
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
