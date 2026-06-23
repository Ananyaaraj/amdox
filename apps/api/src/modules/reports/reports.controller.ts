import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantId } from "../../common/decorators";
import { ReportsService } from "./reports.service";
import { PdfGeneratorService } from "./pdf-generator.service";
import { ExcelGeneratorService } from "./excel-generator.service";

type Module = "finance" | "hr" | "inventory" | "projects";
type Format = "pdf" | "excel";

const MODULE_LABELS: Record<Module, string> = {
  finance: "Finance_Report",
  hr: "HR_Payroll_Report",
  inventory: "Inventory_Supply_Chain_Report",
  projects: "Projects_Report",
};

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private pdfGenerator: PdfGeneratorService,
    private excelGenerator: ExcelGeneratorService
  ) {}

  @Get(":module/:format")
  @ApiOperation({ summary: "Download a report as PDF or Excel" })
  @ApiParam({ name: "module", enum: ["finance", "hr", "inventory", "projects"] })
  @ApiParam({ name: "format", enum: ["pdf", "excel"] })
  async downloadReport(
    @Param("module") module: Module,
    @Param("format") format: Format,
    @TenantId() tenantId: string,
    @Res() res: Response
  ) {
    // Fetch data
    let data: any;
    if (module === "finance")   data = await this.reportsService.getFinanceReport(tenantId);
    else if (module === "hr")   data = await this.reportsService.getHrReport(tenantId);
    else if (module === "inventory") data = await this.reportsService.getInventoryReport(tenantId);
    else                        data = await this.reportsService.getProjectsReport(tenantId);

    const label = MODULE_LABELS[module];
    const date  = new Date().toISOString().slice(0, 10);

    if (format === "pdf") {
      let buffer: Buffer;
      if (module === "finance")        buffer = await this.pdfGenerator.generateFinancePdf(data);
      else if (module === "hr")        buffer = await this.pdfGenerator.generateHrPdf(data);
      else if (module === "inventory") buffer = await this.pdfGenerator.generateInventoryPdf(data);
      else                             buffer = await this.pdfGenerator.generateProjectsPdf(data);

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${label}_${date}.pdf"`,
        "Content-Length": buffer.length,
      });
      res.end(buffer);
    } else {
      let buffer: Buffer;
      if (module === "finance")        buffer = await this.excelGenerator.generateFinanceExcel(data);
      else if (module === "hr")        buffer = await this.excelGenerator.generateHrExcel(data);
      else if (module === "inventory") buffer = await this.excelGenerator.generateInventoryExcel(data);
      else                             buffer = await this.excelGenerator.generateProjectsExcel(data);

      res.set({
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${label}_${date}.xlsx"`,
        "Content-Length": buffer.length,
      });
      res.end(buffer);
    }
  }
}
