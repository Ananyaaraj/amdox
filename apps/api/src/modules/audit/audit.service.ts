import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  private serializeLog(obj: any): string {
    const keys = Object.keys(obj).sort();
    const sortedObj: any = {};
    for (const key of keys) {
      const val = obj[key];
      if (val === undefined || val === null) {
        sortedObj[key] = null;
      } else if (typeof val === "object" && !(val instanceof Date)) {
        sortedObj[key] = JSON.stringify(val);
      } else if (val instanceof Date) {
        sortedObj[key] = val.getTime();
      } else {
        sortedObj[key] = val;
      }
    }
    return JSON.stringify(sortedObj);
  }

  async log(data: {
    tenantId: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    before?: any;
    after?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const createdAt = new Date();

    // Get last hash for chaining
    const lastLog = await this.prisma.auditLog.findFirst({
      where: { tenantId: data.tenantId },
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });

    const serializedData = this.serializeLog({
      tenantId: data.tenantId,
      userId: data.userId || null,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId || null,
      before: data.before || null,
      after: data.after || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      prevHash: lastLog?.hash || null,
      createdAtTime: createdAt.getTime(),
    });

    const hash = createHash("sha256").update(serializedData).digest("hex");

    return this.prisma.auditLog.create({
      data: { ...data, hash, createdAt },
    });
  }

  async getLogs(tenantId: string, filters: {
    resource?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          ...(filters.resource && { resource: filters.resource }),
          ...(filters.userId && { userId: filters.userId }),
          ...(filters.from && { createdAt: { gte: filters.from } }),
          ...(filters.to && { createdAt: { lte: filters.to } }),
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: { tenantId } }),
    ]);

    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async verifyIntegrity(tenantId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    let tampered = 0;
    for (let i = 1; i < logs.length; i++) {
      const log = logs[i];
      const prev = logs[i - 1];

      const serializedData = this.serializeLog({
        tenantId: log.tenantId,
        userId: log.userId,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        before: log.before,
        after: log.after,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        prevHash: prev.hash,
        createdAtTime: new Date(log.createdAt).getTime(),
      });

      const expectedHash = createHash("sha256").update(serializedData).digest("hex");
      if (expectedHash !== log.hash) {
        tampered++;
      }
    }

    return { total: logs.length, tampered, isIntact: tampered === 0 };
  }

  async handleDSR(tenantId: string, userId: string) {
    const [employee, leaves, attendance, payroll] = await Promise.all([
      this.prisma.employee.findFirst({ where: { userId, tenantId } }),
      this.prisma.leave.findMany({ where: { employee: { userId, tenantId } } }),
      this.prisma.attendance.findMany({ where: { employee: { userId, tenantId } } }),
      this.prisma.payrollEmployee.findMany({ where: { employee: { userId, tenantId } } }),
    ]);

    return { employee, leaves, attendance, payroll, exportedAt: new Date() };
  }
}
