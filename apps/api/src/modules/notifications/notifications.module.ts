import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsListener } from "./notifications.listener";
import { NotificationsGateway } from "./notifications.gateway";

@Module({
  imports: [BullModule.registerQueue({ name: "notifications" })],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsListener, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
