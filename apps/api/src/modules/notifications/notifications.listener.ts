import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationType, NotificationChannel } from "@prisma/client";

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private notifService: NotificationsService,
    private prisma: PrismaService
  ) {}

  private async notifyAdmins(tenantId: string, title: string, body: string, type: NotificationType) {
    try {
      const users = await this.prisma.tenantUser.findMany({
        where: { tenantId },
      });
      for (const u of users) {
        await this.notifService.send({
          tenantId,
          userId: u.userId,
          title,
          body,
          type,
          channel: NotificationChannel.IN_APP,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to dispatch notifications: ${err.message}`);
    }
  }

  @OnEvent("inventory.low-stock")
  async onLowStock(payload: any) {
    this.logger.log(`Low stock event: ${payload.product.name}`);
    const title = `Low Stock Alert: ${payload.product.name}`;
    const body = `Product ${payload.product.name} (SKU: ${payload.product.sku}) has reached low stock level. Current quantity: ${Number(payload.inventory.quantity)}, Reorder point: ${Number(payload.product.reorderPoint)}.`;
    await this.notifyAdmins(payload.tenantId, title, body, NotificationType.WARNING);
  }

  @OnEvent("po.created")
  async onPOCreated(payload: any) {
    this.logger.log(`PO created: ${payload.po.poNumber}`);
    const title = `Purchase Order Created: ${payload.po.poNumber}`;
    const body = `Purchase Order ${payload.po.poNumber} has been created for vendor ${payload.vendor.name}. Total amount: $${Number(payload.po.totalAmount).toFixed(2)}.`;
    await this.notifyAdmins(payload.tenantId, title, body, NotificationType.SUCCESS);
  }

  @OnEvent("project.budget-overrun")
  async onBudgetOverrun(payload: any) {
    this.logger.warn(`Budget overrun: ${payload.project.name}`);
    const title = `Project Budget Overrun: ${payload.project.name}`;
    const body = `Project ${payload.project.name} has exceeded its budget! Budget: $${Number(payload.project.budget).toFixed(2)}, Actual Cost: $${Number(payload.project.actualCost).toFixed(2)}.`;
    await this.notifyAdmins(payload.tenantId, title, body, NotificationType.ERROR);
  }
}
