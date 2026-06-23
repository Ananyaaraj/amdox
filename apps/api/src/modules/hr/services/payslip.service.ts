import { Injectable, Logger } from "@nestjs/common";

export interface PayslipData {
  employee: {
    name: string;
    employeeNumber: string;
    jobTitle: string;
    department: string;
  };
  period: string;
  grossSalary: number;
  deductions: Record<string, number>;
  netSalary: number;
  currency: string;
  processedAt: Date;
}

@Injectable()
export class PayslipService {
  private readonly logger = new Logger(PayslipService.name);

  /**
   * F-04: Payslip PDF generation
   * In production: uses Puppeteer to render HTML → PDF.
   * Install: pnpm add puppeteer
   */
  async generatePayslipPdf(data: PayslipData): Promise<Buffer> {
    this.logger.log(`Generating payslip for ${data.employee.name} - ${data.period}`);

    const html = this.buildPayslipHtml(data);

    // Production implementation with Puppeteer:
    // const puppeteer = await import("puppeteer");
    // const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    // const page = await browser.newPage();
    // await page.setContent(html, { waitUntil: "networkidle0" });
    // const pdf = await page.pdf({ format: "A4", printBackground: true });
    // await browser.close();
    // return Buffer.from(pdf);

    // Stub: return HTML as buffer for dev
    return Buffer.from(html, "utf-8");
  }

  private buildPayslipHtml(data: PayslipData): string {
    const deductionRows = Object.entries(data.deductions)
      .map(([key, val]) => `<tr><td>${key}</td><td style="text-align:right">${this.fmt(val, data.currency)}</td></tr>`)
      .join("");

    const totalDeductions = Object.values(data.deductions).reduce((a, b) => a + b, 0);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; font-size: 13px; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: bold; color: #2563eb; }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-weight: 600; }
    td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }
    .total-row td { font-weight: bold; background: #f8fafc; }
    .net { background: #2563eb; color: white; }
    .net td { padding: 12px; font-size: 15px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div><div class="company">Amdox Technologies</div><div>Payslip — ${data.period}</div></div>
    <div style="text-align:right">
      <div><strong>Employee:</strong> ${data.employee.name}</div>
      <div><strong>ID:</strong> ${data.employee.employeeNumber}</div>
      <div><strong>Processed:</strong> ${data.processedAt.toLocaleDateString()}</div>
    </div>
  </div>

  <div class="title">Employee Details</div>
  <table>
    <tr><th>Name</th><td>${data.employee.name}</td><th>Department</th><td>${data.employee.department}</td></tr>
    <tr><th>Job Title</th><td>${data.employee.jobTitle}</td><th>Period</th><td>${data.period}</td></tr>
  </table>

  <div class="title">Earnings</div>
  <table>
    <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
    <tr><td>Basic Salary</td><td style="text-align:right">${this.fmt(data.grossSalary, data.currency)}</td></tr>
    <tr class="total-row"><td>Gross Total</td><td style="text-align:right">${this.fmt(data.grossSalary, data.currency)}</td></tr>
  </table>

  <div class="title">Deductions</div>
  <table>
    <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
    ${deductionRows}
    <tr class="total-row"><td>Total Deductions</td><td style="text-align:right">${this.fmt(totalDeductions, data.currency)}</td></tr>
  </table>

  <table>
    <tr class="net"><td>NET PAY</td><td style="text-align:right">${this.fmt(data.netSalary, data.currency)}</td></tr>
  </table>

  <div style="margin-top:32px;font-size:11px;color:#94a3b8;">This is a computer-generated payslip. No signature required.</div>
</body>
</html>`;
  }

  private fmt(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  }
}
