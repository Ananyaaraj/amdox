import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, TenantId, CurrentUser } from "../../common/decorators";
import { FinanceService } from "./finance.service";
import { CreateJournalEntryDto } from "./dto/journal-entry.dto";
import { CreateInvoiceDto } from "./dto/invoice.dto";

@ApiTags("finance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("finance")
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  // Chart of Accounts
  @Get("accounts")
  @ApiOperation({ summary: "Get chart of accounts" })
  getAccounts(@TenantId() tenantId: string) {
    return this.financeService.getAccounts(tenantId);
  }

  // Journal Entries
  @Post("journal-entries")
  @Roles("MANAGER", "TENANT_ADMIN")
  @ApiOperation({ summary: "Create journal entry" })
  createJournalEntry(
    @TenantId() tenantId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateJournalEntryDto
  ) {
    return this.financeService.createJournalEntry(tenantId, userId, dto);
  }

  @Get("journal-entries")
  @ApiOperation({ summary: "List journal entries" })
  getJournalEntries(
    @TenantId() tenantId: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.financeService.getJournalEntries(tenantId, {
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Patch("journal-entries/:id/post")
  @Roles("MANAGER", "TENANT_ADMIN")
  @ApiOperation({ summary: "Post a draft journal entry" })
  postJournalEntry(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.financeService.postJournalEntry(tenantId, id);
  }

  // Invoices
  @Post("invoices")
  @Roles("MANAGER", "TENANT_ADMIN")
  @ApiOperation({ summary: "Create invoice (AP or AR)" })
  createInvoice(@TenantId() tenantId: string, @Body() dto: CreateInvoiceDto) {
    return this.financeService.createInvoice(tenantId, dto);
  }

  @Get("invoices")
  @ApiOperation({ summary: "List invoices" })
  getInvoices(
    @TenantId() tenantId: string,
    @Query("type") type?: string,
    @Query("status") status?: string
  ) {
    return this.financeService.getInvoices(tenantId, type, status);
  }

  @Patch("invoices/:id/approve")
  @Roles("MANAGER", "TENANT_ADMIN")
  @ApiOperation({ summary: "Approve invoice" })
  approveInvoice(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.financeService.approveInvoice(tenantId, id);
  }

  // Reports
  @Get("reports/aging")
  @ApiOperation({ summary: "AR aging report" })
  getAgingReport(@TenantId() tenantId: string) {
    return this.financeService.getAgingReport(tenantId);
  }

  @Get("reports/trial-balance")
  @ApiOperation({ summary: "Trial balance" })
  getTrialBalance(@TenantId() tenantId: string) {
    return this.financeService.getTrialBalance(tenantId);
  }
}
