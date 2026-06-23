import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class SupplyChainService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2
  ) {}

  // =================== VENDORS ===================
  async getVendors(tenantId: string) {
    return this.prisma.vendor.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { name: "asc" },
    });
  }

  async createVendor(tenantId: string, dto: any) {
    return this.prisma.vendor.create({ data: { ...dto, tenantId } });
  }

  // =================== PRODUCTS / INVENTORY ===================
  async getProducts(tenantId: string, filters: { category?: string; lowStock?: boolean }) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true, ...(filters.category && { category: filters.category }) },
      include: { inventory: true },
      orderBy: { name: "asc" },
    });

    if (filters.lowStock) {
      return products.filter((p) => {
        const total = p.inventory.reduce((sum, i) => sum + Number(i.quantity), 0);
        return total <= Number(p.reorderPoint);
      });
    }

    return products;
  }

  async getInventoryStatus(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { inventory: true },
    });

    return products.map((p) => ({
      ...p,
      totalStock: p.inventory.reduce((sum, i) => sum + Number(i.quantity), 0),
      isLowStock: p.inventory.reduce((sum, i) => sum + Number(i.quantity), 0) <= Number(p.reorderPoint),
    }));
  }

  async adjustInventory(tenantId: string, productId: string, qty: number, warehouse: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException("Product not found");

    const inventory = await this.prisma.inventoryItem.upsert({
      where: { productId_warehouse: { productId, warehouse } },
      create: { productId, warehouse, quantity: qty, costPrice: product.unitPrice },
      update: { quantity: { increment: qty } },
    });

    // Check for reorder
    if (Number(inventory.quantity) <= Number(product.reorderPoint)) {
      this.events.emit("inventory.low-stock", { product, inventory, tenantId });
    }

    return inventory;
  }

  // =================== PURCHASE ORDERS ===================
  async createPO(tenantId: string, dto: any) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendorId, tenantId } });
    if (!vendor) throw new NotFoundException("Vendor not found");

    const totalAmount = dto.lines.reduce(
      (sum: number, l: any) => sum + l.quantity * l.unitPrice,
      0
    );

    const po = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        poNumber: `PO-${Date.now()}`,
        vendorId: dto.vendorId,
        currency: dto.currency || "USD",
        totalAmount,
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((l: any) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.quantity * l.unitPrice,
          })),
        },
      },
      include: { lines: { include: { product: true } }, vendor: true },
    });

    // Notify vendor
    this.events.emit("po.created", { po, vendor, tenantId });

    return po;
  }

  async getPurchaseOrders(tenantId: string, status?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { tenantId, ...(status && { status: status as any }) },
      include: { lines: { include: { product: true } }, vendor: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async receivePO(tenantId: string, poId: string, lines: Array<{ lineId: string; receivedQty: number }>) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: { lines: true },
    });
    if (!po) throw new NotFoundException("PO not found");

    for (const recv of lines) {
      const line = po.lines.find((l) => l.id === recv.lineId);
      if (!line) continue;

      await this.prisma.purchaseOrderLine.update({
        where: { id: recv.lineId },
        data: { receivedQty: { increment: recv.receivedQty } },
      });

      // Update inventory
      await this.adjustInventory(tenantId, line.productId, recv.receivedQty, "DEFAULT");
    }

    // Check if fully received
    const updated = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { lines: true },
    });
    const fullyReceived = updated!.lines.every(
      (l) => Number(l.receivedQty) >= Number(l.quantity)
    );

    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
        ...(fullyReceived && { receivedAt: new Date() }),
      },
    });
  }

  // =================== DEMAND FORECAST ===================
  async getDemandForecast(tenantId: string, productId?: string) {
    return this.prisma.demandForecast.findMany({
      where: {
        ...(productId && { productId }),
        product: { tenantId },
        forecastDate: { gte: new Date() },
      },
      include: { product: true },
      orderBy: { forecastDate: "asc" },
      take: 90,
    });
  }
}
