import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, TenantId } from "../../common/decorators";
import { BiService } from "./bi.service";

@ApiTags("bi")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("bi")
export class BiController {
  constructor(private biService: BiService) {}

  @Get("kpis")
  @ApiOperation({ summary: "Get key performance indicators" })
  getKpis(@TenantId() tenantId: string) {
    return this.biService.getKpis(tenantId);
  }

  @Get("revenue-trend")
  getRevenueTrend(@TenantId() tenantId: string, @Query("months") months?: number) {
    return this.biService.getRevenueTrend(tenantId, months);
  }

  @Get("expense-breakdown")
  getExpenseBreakdown(@TenantId() tenantId: string) {
    return this.biService.getExpenseBreakdown(tenantId);
  }

  @Get("inventory-summary")
  getInventorySummary(@TenantId() tenantId: string) {
    return this.biService.getInventorySummary(tenantId);
  }

  @Get("project-health")
  getProjectHealth(@TenantId() tenantId: string) {
    return this.biService.getProjectHealth(tenantId);
  }

  @Get("dashboards")
  getDashboards(@TenantId() tenantId: string, @CurrentUser("id") userId: string) {
    return this.biService.getDashboards(tenantId, userId);
  }

  @Get("dashboards/:id")
  getDashboard(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.biService.getDashboard(tenantId, id);
  }

  @Post("dashboards")
  saveDashboard(
    @TenantId() tenantId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: { name: string; config: any }
  ) {
    return this.biService.saveDashboard(tenantId, userId, dto);
  }

  @Put("dashboards/:id")
  updateDashboard(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: { name?: string; config?: any }
  ) {
    return this.biService.updateDashboard(tenantId, id, dto);
  }
}
