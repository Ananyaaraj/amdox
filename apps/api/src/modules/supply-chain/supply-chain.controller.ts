import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantId } from "../../common/decorators";
import { SupplyChainService } from "./supply-chain.service";

@ApiTags("supply-chain")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("supply-chain")
export class SupplyChainController {
  constructor(private scService: SupplyChainService) {}

  // Vendors
  @Get("vendors")
  getVendors(@TenantId() tenantId: string) {
    return this.scService.getVendors(tenantId);
  }

  @Post("vendors")
  createVendor(@TenantId() tenantId: string, @Body() dto: any) {
    return this.scService.createVendor(tenantId, dto);
  }

  // Products
  @Get("products")
  getProducts(
    @TenantId() tenantId: string,
    @Query("category") category?: string,
    @Query("lowStock") lowStock?: string
  ) {
    return this.scService.getProducts(tenantId, { category, lowStock: lowStock === "true" });
  }

  @Get("inventory")
  @ApiOperation({ summary: "Get full inventory status with low-stock indicators" })
  getInventoryStatus(@TenantId() tenantId: string) {
    return this.scService.getInventoryStatus(tenantId);
  }

  @Post("inventory/adjust")
  adjustInventory(
    @TenantId() tenantId: string,
    @Body() body: { productId: string; qty: number; warehouse: string }
  ) {
    return this.scService.adjustInventory(tenantId, body.productId, body.qty, body.warehouse || "DEFAULT");
  }

  // Purchase Orders
  @Post("purchase-orders")
  createPO(@TenantId() tenantId: string, @Body() dto: any) {
    return this.scService.createPO(tenantId, dto);
  }

  @Get("purchase-orders")
  getPurchaseOrders(@TenantId() tenantId: string, @Query("status") status?: string) {
    return this.scService.getPurchaseOrders(tenantId, status);
  }

  @Post("purchase-orders/:id/receive")
  receivePO(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { lines: Array<{ lineId: string; receivedQty: number }> }
  ) {
    return this.scService.receivePO(tenantId, id, body.lines);
  }

  // Forecasting
  @Get("forecasts")
  getDemandForecast(@TenantId() tenantId: string, @Query("productId") productId?: string) {
    return this.scService.getDemandForecast(tenantId, productId);
  }
}
