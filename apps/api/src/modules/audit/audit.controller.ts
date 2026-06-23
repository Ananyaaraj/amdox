import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, TenantId } from "../../common/decorators";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("audit")
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get("logs")
  @Roles("TENANT_ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get immutable audit logs" })
  getLogs(
    @TenantId() tenantId: string,
    @Query("resource") resource?: string,
    @Query("userId") userId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ) {
    return this.auditService.getLogs(tenantId, {
      resource,
      userId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page,
      limit,
    });
  }

  @Get("integrity")
  @Roles("TENANT_ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Verify audit log integrity via hash chain" })
  verifyIntegrity(@TenantId() tenantId: string) {
    return this.auditService.verifyIntegrity(tenantId);
  }

  @Post("dsr")
  @Roles("TENANT_ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "GDPR Data Subject Request - export user data" })
  handleDSR(@TenantId() tenantId: string, @Body("userId") userId: string) {
    return this.auditService.handleDSR(tenantId, userId);
  }
}
