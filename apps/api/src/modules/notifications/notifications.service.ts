import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationType, NotificationChannel } from "@prisma/client";

export interface SendNotificationDto {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  channel: NotificationChannel;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue("notifications") private notifQueue: Queue
  ) {}

  async send(dto: SendNotificationDto) {
    // Store in DB
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        channel: dto.channel,
        data: dto.data,
      },
    });

    // Queue for delivery
    await this.notifQueue.add(
      "deliver",
      { notificationId: notification.id, ...dto },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    );

    return notification;
  }

  async sendBulk(notifications: SendNotificationDto[]) {
    return Promise.all(notifications.map((n) => this.send(n)));
  }

  async getForUser(userId: string, tenantId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, tenantId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string, tenantId: string) {
    return this.prisma.notification.count({
      where: { userId, tenantId, read: false },
    });
  }
}
