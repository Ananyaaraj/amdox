import { Controller, Get, Patch, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, TenantId } from "../../common/decorators";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private notifService: NotificationsService) {}

  @Get()
  getNotifications(
    @CurrentUser("id") userId: string,
    @TenantId() tenantId: string,
    @Query("unread") unread?: string
  ) {
    return this.notifService.getForUser(userId, tenantId, unread === "true");
  }

  @Get("unread-count")
  getUnreadCount(@CurrentUser("id") userId: string, @TenantId() tenantId: string) {
    return this.notifService.getUnreadCount(userId, tenantId);
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.notifService.markRead(id, userId);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser("id") userId: string, @TenantId() tenantId: string) {
    return this.notifService.markAllRead(userId, tenantId);
  }
}
