import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";

import { AuthModule } from "./modules/auth/auth.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { HrModule } from "./modules/hr/hr.module";
import { SupplyChainModule } from "./modules/supply-chain/supply-chain.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { BiModule } from "./modules/bi/bi.module";
import { AuditModule } from "./modules/audit/audit.module";
import { HealthModule } from "./modules/health/health.module";
import { ReportsModule } from "./modules/reports/reports.module";   // ← NEW
import { PrismaModule } from "./common/prisma/prisma.module";
import { SearchModule } from "./common/search/search.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", "../../.env"] }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get("RATE_LIMIT_TTL", 60) * 1000,
          limit: config.get("RATE_LIMIT_MAX", 100),
        },
      ],
    }),

    EventEmitterModule.forRoot({ wildcard: true, delimiter: "." }),
    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>("REDIS_URL");
        const isVercel = !!process.env.VERCEL;

        let connectionOpts: any;

        if (redisUrl) {
          try {
            const url = new URL(redisUrl);
            connectionOpts = {
              host: url.hostname,
              port: parseInt(url.port || "6379", 10),
              password: url.password || undefined,
            };
          } catch {
            connectionOpts = {
              host: config.get("REDIS_HOST", "localhost"),
              port: config.get<number>("REDIS_PORT", 6379),
              password: config.get("REDIS_PASSWORD"),
            };
          }
        } else {
          connectionOpts = {
            host: config.get("REDIS_HOST", "localhost"),
            port: config.get<number>("REDIS_PORT", 6379),
            password: config.get("REDIS_PASSWORD"),
          };
        }

        return {
          connection: {
            ...connectionOpts,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            retryStrategy: (times: number) => {
              if (isVercel && !redisUrl) {
                return null; // Stop retrying immediately to prevent Vercel functions from hanging/timing out
              }
              return Math.min(times * 100, 3000);
            },
          },
        };
      },
    }),

    PrismaModule,
    SearchModule,
    HealthModule,
    AuthModule,
    FinanceModule,
    HrModule,
    SupplyChainModule,
    ProjectsModule,
    NotificationsModule,
    BiModule,
    AuditModule,
    ReportsModule,  // ← NEW
  ],
})
export class AppModule {}
