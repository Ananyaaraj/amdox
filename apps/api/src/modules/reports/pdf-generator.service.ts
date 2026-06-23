import { Injectable } from "@nestjs/common";

// We use pdfkit — install with: pnpm add pdfkit @types/pdfkit
// It's a pure Node.js PDF library, no external binaries needed.
import PDFDocument from "pdfkit";
import { Writable } from "stream";

const PRIMARY = "#1e40af";   // blue-800
const ACCENT  = "#3b82f6";   // blue-500
const MUTED   = "#6b7280";   // gray-500
const BORDER  = "#e5e7eb";   // gray-200
const BG_ROW  = "#f9fafb";   // gray-50

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

@Injectable()
export class PdfGeneratorService {
  // ─── helpers ──────────────────────────────────────────────────────────────

  private addHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
    doc.rect(0, 0, doc.page.width, 80).fill(PRIMARY);
    doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("Amdox ERP", 40, 22);
    doc.fontSize(10).font("Helvetica").text(new Date().toLocaleDateString("en-US", { dateStyle: "long" }), 40, 48);
    doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold").text(title, 0, 22, { align: "center" });
    doc.fontSize(9).font("Helvetica").fillColor("#bfdbfe").text(subtitle, 0, 46, { align: "center" });
    doc.moveDown(4);
    doc.fillColor("#000000");
  }

  private addSectionTitle(doc: PDFKit.PDFDocument, text: string) {
    doc.moveDown(0.5);
    doc.rect(40, doc.y, doc.page.width - 80, 22).fill(ACCENT);
    doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text(text, 48, doc.y - 18);
    doc.fillColor("#000000").moveDown(0.8);
  }

  private addKpiRow(doc: PDFKit.PDFDocument, items: { label: string; value: string }[]) {
    const colW = (doc.page.width - 80) / items.length;
    const startY = doc.y;
    items.forEach((item, i) => {
      const x = 40 + i * colW;
      doc.rect(x, startY, colW - 4, 48).fill(BG_ROW).stroke(BORDER);
      doc.fillColor(MUTED).fontSize(8).font("Helvetica").text(item.label, x + 8, startY + 8, { width: colW - 16 });
      doc.fillColor(PRIMARY).fontSize(14).font("Helvetica-Bold").text(item.value, x + 8, startY + 22, { width: colW - 16 });
    });
    doc.fillColor("#000000").moveDown(3.5);
  }

  private addTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    rows: (string | number)[][][],
    colWidths?: number[]
  ) {
    const pageW = doc.page.width - 80;
    const cols = colWidths ?? headers.map(() => pageW / headers.length);
    const rowH = 20;
    let x = 40;
    let y = doc.y;

    // header row
    doc.rect(x, y, pageW, rowH).fill(PRIMARY);
    headers.forEach((h, i) => {
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold")
        .text(h, x + 4, y + 6, { width: cols[i] - 8, ellipsis: true });
      x += cols[i];
    });
    y += rowH;

    // data rows
    rows.forEach((row, ri) => {
      if (y + rowH > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      doc.rect(40, y, pageW, rowH).fill(ri % 2 === 0 ? "#ffffff" : BG_ROW).stroke(BORDER);
      x = 40;
      row.forEach((cell, ci) => {
        const val = Array.isArray(cell) ? cell.join(" ") : String(cell ?? "");
        doc.fillColor("#111827").fontSize(8).font("Helvetica")
          .text(val, x + 4, y + 6, { width: cols[ci] - 8, ellipsis: true });
        x += cols[ci];
      });
      y += rowH;
    });

    doc.fillColor("#000000").y = y;
    doc.moveDown(1);
  }

  private addFooter(doc: PDFKit.PDFDocument) {
    const pages = (doc as any).bufferedPageRange?.() ?? { start: 0, count: 1 };
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill("#f3f4f6");
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica")
        .text(
          `Amdox ERP — Confidential  |  Generated ${new Date().toISOString()}  |  Page ${i + 1} of ${pages.count}`,
          0,
          doc.page.height - 18,
          { align: "center" }
        );
    }
  }

  // ─── FINANCE PDF ──────────────────────────────────────────────────────────

  async generateFinancePdf(data: any): Promise<Buffer> {
    const doc = new PDFDocument({ autoFirstPage: true, bufferPages: true, margin: 40 });
    this.addHeader(doc, "Finance Report", `Invoices, Journal Entries & Accounts`);

    // KPIs
    this.addSectionTitle(doc, "Summary");
    this.addKpiRow(doc, [
      { label: "Total AR", value: currency(data.summary.totalAR) },
      { label: "Total AP", value: currency(data.summary.totalAP) },
      { label: "Paid Invoices", value: String(data.summary.paidInvoices) },
      { label: "Total Invoices", value: String(data.summary.totalInvoices) },
    ]);

    // Invoices table
    this.addSectionTitle(doc, "Invoices");
    this.addTable(
      doc,
      ["Invoice #", "Type", "Vendor/Customer", "Amount", "Status", "Date"],
      data.invoices.slice(0, 100).map((inv: any) => [
        [inv.invoiceNumber ?? inv.id.slice(0, 8)],
        [inv.type],
        [inv.vendorId ?? "—"],
        [currency(Number(inv.totalAmount))],
        [inv.status],
        [new Date(inv.createdAt).toLocaleDateString()],
      ]),
      [90, 50, 110, 90, 70, 80]
    );

    // Accounts table
    this.addSectionTitle(doc, "Chart of Accounts");
    this.addTable(
      doc,
      ["Code", "Name", "Type", "Currency", "Active"],
      data.accounts.slice(0, 100).map((a: any) => [
        [a.code], [a.name], [a.type], [a.currency ?? "USD"], [a.isActive ? "Yes" : "No"],
      ]),
      [70, 160, 90, 80, 50]
    );

    this.addFooter(doc);
    return bufferFromDoc(doc);
  }

  // ─── HR PDF ───────────────────────────────────────────────────────────────

  async generateHrPdf(data: any): Promise<Buffer> {
    const doc = new PDFDocument({ autoFirstPage: true, bufferPages: true, margin: 40 });
    this.addHeader(doc, "HR & Payroll Report", "Employees, Departments & Leave");

    this.addSectionTitle(doc, "Summary");
    this.addKpiRow(doc, [
      { label: "Total Employees", value: String(data.summary.totalEmployees) },
      { label: "Active", value: String(data.summary.activeCount) },
      { label: "Total Monthly Payroll", value: currency(data.summary.totalPayroll) },
      { label: "Departments", value: String(data.departments.length) },
    ]);

    this.addSectionTitle(doc, "Employees");
    this.addTable(
      doc,
      ["Name", "Department", "Position", "Salary", "Status", "Start Date"],
      data.employees.slice(0, 200).map((e: any) => [
        [`${e.firstName} ${e.lastName}`],
        [e.department?.name ?? "—"],
        [e.jobTitle ?? "—"],
        [currency(Number(e.baseSalary))],
        [e.status],
        [new Date(e.startDate).toLocaleDateString()],
      ]),
      [120, 100, 100, 80, 60, 80]
    );

    this.addSectionTitle(doc, "Departments");
    this.addTable(
      doc,
      ["Name", "Head Count"],
      data.departments.map((d: any) => [
        [d.name], [String(d._count?.employees ?? 0)],
      ]),
      [300, 100]
    );

    this.addFooter(doc);
    return bufferFromDoc(doc);
  }

  // ─── INVENTORY PDF ────────────────────────────────────────────────────────

  async generateInventoryPdf(data: any): Promise<Buffer> {
    const doc = new PDFDocument({ autoFirstPage: true, bufferPages: true, margin: 40 });
    this.addHeader(doc, "Inventory & Supply Chain Report", "Products, Purchase Orders & Vendors");

    this.addSectionTitle(doc, "Summary");
    this.addKpiRow(doc, [
      { label: "Total Products", value: String(data.summary.totalProducts) },
      { label: "Inventory Value", value: currency(data.summary.totalInventoryValue) },
      { label: "Purchase Orders", value: String(data.summary.totalPOs) },
      { label: "Vendors", value: String(data.summary.totalVendors) },
    ]);

    this.addSectionTitle(doc, "Products");
    this.addTable(
      doc,
      ["SKU", "Name", "Category", "Unit Price", "Stock Qty"],
      data.products.slice(0, 200).map((p: any) => {
        const qty = p.inventory?.reduce((s: number, i: any) => s + Number(i.quantity), 0) ?? 0;
        return [
          [p.sku ?? "—"], [p.name], [p.category ?? "—"],
          [currency(Number(p.unitPrice))], [String(qty)],
        ];
      }),
      [80, 160, 100, 90, 70]
    );

    this.addSectionTitle(doc, "Vendors");
    this.addTable(
      doc,
      ["Name", "Email", "Country", "Active"],
      data.vendors.map((v: any) => [
        [v.name], [v.email ?? "—"], [v.country ?? "—"], [v.isActive ? "Yes" : "No"],
      ]),
      [160, 160, 100, 50]
    );

    this.addFooter(doc);
    return bufferFromDoc(doc);
  }

  // ─── PROJECTS PDF ─────────────────────────────────────────────────────────

  async generateProjectsPdf(data: any): Promise<Buffer> {
    const doc = new PDFDocument({ autoFirstPage: true, bufferPages: true, margin: 40 });
    this.addHeader(doc, "Projects Report", "Budget, Completion & Status Overview");

    this.addSectionTitle(doc, "Summary");
    this.addKpiRow(doc, [
      { label: "Total Projects", value: String(data.summary.totalProjects) },
      { label: "Active", value: String(data.summary.activeCount) },
      { label: "Total Budget", value: currency(data.summary.totalBudget) },
      { label: "Actual Cost", value: currency(data.summary.totalActual) },
    ]);

    this.addSectionTitle(doc, "Project Details");
    this.addTable(
      doc,
      ["Project Name", "Status", "Budget", "Actual", "Budget Used %", "Completion %", "Days Left"],
      data.projects.map((p: any) => [
        [p.name],
        [p.status],
        [currency(Number(p.budget))],
        [currency(Number(p.actualCost))],
        [pct(Number(p.budget) > 0 ? (Number(p.actualCost) / Number(p.budget)) * 100 : 0)],
        [pct(p.completionPct)],
        [String(Math.max(0, Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000)))],
      ]),
      [120, 65, 75, 75, 75, 75, 65]
    );

    this.addFooter(doc);
    return bufferFromDoc(doc);
  }
}
