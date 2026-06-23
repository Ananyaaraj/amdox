import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";

function currency(n: number) {
  return Number(n.toFixed(2));
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E40AF" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 10,
};

const TITLE_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 14,
  color: { argb: "FF1E40AF" },
};

const ALT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF9FAFB" },
};

const CURRENCY_FMT = '"$"#,##0.00';

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF3B82F6" } },
    };
  });
  row.height = 20;
}

function styleDataRows(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  currencyCols: number[] = []
) {
  sheet.eachRow((row, rn) => {
    if (rn < startRow) return;

    row.eachCell((cell, cn) => {
      if (rn % 2 === 0) cell.fill = ALT_FILL;

      cell.alignment = { vertical: "middle" };

      if (currencyCols.includes(cn)) {
        cell.numFmt = CURRENCY_FMT;
      }

      cell.border = {
        bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
      };
    });
  });
}

function addSummarySheet(
  wb: ExcelJS.Workbook,
  title: string,
  items: { label: string; value: string | number }[]
) {
  const sheet = wb.addWorksheet("Summary");

  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 25;

  sheet.mergeCells("A1:B1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = TITLE_FONT;
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 32;

  sheet.mergeCells("A2:B2");
  sheet.getCell("A2").value = `Generated: ${new Date().toLocaleString()}`;
  sheet.getCell("A2").font = {
    italic: true,
    color: { argb: "FF6B7280" },
    size: 9,
  };
  sheet.getCell("A2").alignment = { horizontal: "center" };

  const hRow = sheet.addRow(["Metric", "Value"]);
  styleHeader(hRow);

  items.forEach((item, i) => {
    const row = sheet.addRow([item.label, item.value]);

    if (i % 2 === 0) {
      row.eachCell((c) => (c.fill = ALT_FILL));
    }

    row.height = 18;
  });
}

@Injectable()
export class ExcelGeneratorService {
  // ─── FIX: SAFE BUFFER RETURN ───
  private toBuffer(
    wb: ExcelJS.Workbook
  ): Promise<Buffer> {
    return wb.xlsx
      .writeBuffer()
      .then((buf) => Buffer.from(buf));
  }

  // ─── FINANCE ───────────────────────────────────────────────

  async generateFinanceExcel(data: any): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();

    wb.creator = "Amdox ERP";
    wb.created = new Date();

    addSummarySheet(wb, "Finance Report", [
      { label: "Total Accounts Receivable", value: currency(data.summary.totalAR) },
      { label: "Total Accounts Payable", value: currency(data.summary.totalAP) },
      { label: "Paid Invoices", value: data.summary.paidInvoices },
      { label: "Total Invoices", value: data.summary.totalInvoices },
    ]);

    const invSheet = wb.addWorksheet("Invoices");

    invSheet.columns = [
      { header: "Invoice #", key: "num", width: 20 },
      { header: "Type", key: "type", width: 10 },
      { header: "Status", key: "status", width: 14 },
      { header: "Total Amount", key: "amount", width: 16 },
      { header: "Currency", key: "currency", width: 12 },
      { header: "Due Date", key: "due", width: 14 },
      { header: "Created At", key: "created", width: 16 },
    ];

    styleHeader(invSheet.getRow(1));

    data.invoices.slice(0, 500).forEach((inv: any) => {
      invSheet.addRow({
        num: inv.invoiceNumber ?? inv.id.slice(0, 8),
        type: inv.type,
        status: inv.status,
        amount: currency(Number(inv.totalAmount)),
        currency: inv.currency ?? "USD",
        due: inv.dueDate
          ? new Date(inv.dueDate).toLocaleDateString()
          : "—",
        created: new Date(inv.createdAt).toLocaleDateString(),
      });
    });

    styleDataRows(invSheet, 2, [4]);

    return this.toBuffer(wb);
  }

  // ─── HR ───────────────────────────────────────────────

  async generateHrExcel(data: any): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();

    wb.creator = "Amdox ERP";
    wb.created = new Date();

    addSummarySheet(wb, "HR & Payroll Report", [
      { label: "Total Employees", value: data.summary.totalEmployees },
      { label: "Active Employees", value: data.summary.activeCount },
      { label: "Total Monthly Payroll ($)", value: currency(data.summary.totalPayroll) },
      { label: "Departments", value: data.departments.length },
    ]);

    const leaveSheet = wb.addWorksheet("Leave Requests");

    leaveSheet.columns = [
      { header: "Employee", key: "emp", width: 24 },
      { header: "Type", key: "type", width: 14 },
      { header: "Start Date", key: "start", width: 14 },
      { header: "End Date", key: "end", width: 14 },
      { header: "Status", key: "status", width: 14 },
    ];

    styleHeader(leaveSheet.getRow(1));

    data.leaves.forEach((l: any) => {
      leaveSheet.addRow({
        emp: `${l.employee?.firstName ?? ""} ${l.employee?.lastName ?? ""}`.trim(),
        type: l.leaveType,
        start: new Date(l.startDate).toLocaleDateString(),
        end: new Date(l.endDate).toLocaleDateString(),
        status: l.status,
      });
    });

    styleDataRows(leaveSheet, 2);

    return this.toBuffer(wb);
  }

  // ─── INVENTORY ───────────────────────────────────────────────

  async generateInventoryExcel(data: any): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();

    wb.creator = "Amdox ERP";
    wb.created = new Date();

    addSummarySheet(wb, "Inventory & Supply Chain Report", [
      { label: "Total Products", value: data.summary.totalProducts },
      { label: "Inventory Value ($)", value: currency(data.summary.totalInventoryValue) },
      { label: "Purchase Orders", value: data.summary.totalPOs },
      { label: "Vendors", value: data.summary.totalVendors },
    ]);

    const prodSheet = wb.addWorksheet("Products");

    prodSheet.columns = [
      { header: "SKU", key: "sku", width: 16 },
      { header: "Name", key: "name", width: 28 },
      { header: "Category", key: "cat", width: 18 },
      { header: "Unit Price", key: "price", width: 14 },
      { header: "Stock Qty", key: "qty", width: 12 },
      { header: "Total Value", key: "val", width: 16 },
    ];

    styleHeader(prodSheet.getRow(1));

    data.products.forEach((p: any) => {
      const qty =
        p.inventory?.reduce((s: number, i: any) => s + Number(i.quantity), 0) ?? 0;

      prodSheet.addRow({
        sku: p.sku ?? "—",
        name: p.name,
        cat: p.category ?? "—",
        price: currency(Number(p.unitPrice)),
        qty,
        val: currency(Number(p.unitPrice) * qty),
      });
    });

    styleDataRows(prodSheet, 2, [4, 6]);

    return this.toBuffer(wb);
  }

  // ─── PROJECTS ───────────────────────────────────────────────

  async generateProjectsExcel(data: any): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();

    wb.creator = "Amdox ERP";
    wb.created = new Date();

    addSummarySheet(wb, "Projects Report", [
      { label: "Total Projects", value: data.summary.totalProjects },
      { label: "Active Projects", value: data.summary.activeCount },
      { label: "Total Budget ($)", value: currency(data.summary.totalBudget) },
      { label: "Total Actual Cost ($)", value: currency(data.summary.totalActual) },
    ]);

    const projSheet = wb.addWorksheet("Projects");

    projSheet.columns = [
      { header: "Project Name", key: "name", width: 28 },
      { header: "Status", key: "status", width: 14 },
      { header: "Budget", key: "budget", width: 16 },
      { header: "Actual Cost", key: "actual", width: 16 },
      { header: "Budget Used %", key: "budgetPct", width: 15 },
      { header: "Completion %", key: "completionPct", width: 15 },
      { header: "Start Date", key: "start", width: 14 },
      { header: "End Date", key: "end", width: 14 },
      { header: "Days Left", key: "days", width: 12 },
    ];

    styleHeader(projSheet.getRow(1));

    data.projects.forEach((p: any) => {
      const budgetPct =
        Number(p.budget) > 0
          ? (Number(p.actualCost) / Number(p.budget)) * 100
          : 0;

      const daysLeft = Math.max(
        0,
        Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000)
      );

      projSheet.addRow({
        name: p.name,
        status: p.status,
        budget: currency(Number(p.budget)),
        actual: currency(Number(p.actualCost)),
        budgetPct: `${currency(budgetPct)}%`,
        completionPct: `${p.completionPct}%`,
        start: new Date(p.startDate).toLocaleDateString(),
        end: new Date(p.endDate).toLocaleDateString(),
        days: daysLeft,
      });
    });

    styleDataRows(projSheet, 2, [3, 4]);

    return this.toBuffer(wb);
  }
}