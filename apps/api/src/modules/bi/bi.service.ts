import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class BiService {
  constructor(private prisma: PrismaService) {}

  async getDashboards(tenantId: string, userId: string) {
    return this.prisma.dashboard.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async getDashboard(tenantId: string, id: string) {
    const dashboard = await this.prisma.dashboard.findFirst({ where: { id, tenantId } });
    if (!dashboard) throw new NotFoundException("Dashboard not found");
    return dashboard;
  }

  async saveDashboard(tenantId: string, userId: string, dto: { name: string; config: any }) {
    return this.prisma.dashboard.create({
      data: { tenantId, name: dto.name, config: dto.config, createdBy: userId },
    });
  }

  async updateDashboard(tenantId: string, id: string, dto: { name?: string; config?: any }) {
    await this.getDashboard(tenantId, id);
    return this.prisma.dashboard.update({ where: { id }, data: dto });
  }

  async getKpis(tenantId: string) {
    const [employeeCount, activeProjects, openPOs, openInvoicesAR, openInvoicesAP] =
      await Promise.all([
        this.prisma.employee.count({ where: { tenantId, status: "ACTIVE" } }),
        this.prisma.project.count({ where: { tenantId, status: "ACTIVE" } }),
        this.prisma.purchaseOrder.count({
          where: { tenantId, status: { in: ["DRAFT", "SENT", "ACKNOWLEDGED"] } },
        }),
        this.prisma.invoice.aggregate({
          where: { tenantId, type: "AR", status: { in: ["APPROVED", "OVERDUE"] } },
          _sum: { totalAmount: true },
        }),
        this.prisma.invoice.aggregate({
          where: { tenantId, type: "AP", status: { in: ["APPROVED", "OVERDUE"] } },
          _sum: { totalAmount: true },
        }),
      ]);

    return {
      employees: employeeCount,
      activeProjects,
      openPOs,
      accountsReceivable: openInvoicesAR._sum.totalAmount || 0,
      accountsPayable: openInvoicesAP._sum.totalAmount || 0,
    };
  }

  async getRevenueTrend(tenantId: string, months = 12) {
    // Use Prisma.sql for safe parameterized raw query
    const result = await this.prisma.$queryRaw<any[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          SUM("totalAmount") as revenue,
          COUNT(*) as invoice_count
        FROM invoices
        WHERE "tenantId" = ${tenantId}
          AND type = 'AR'
          AND status IN ('PAID', 'APPROVED')
          AND "createdAt" >= NOW() - (${months} || ' months')::INTERVAL
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `
    );
    return result;
  }

  async getExpenseBreakdown(tenantId: string) {
    const result = await this.prisma.$queryRaw<any[]>(
      Prisma.sql`
        SELECT a.type, SUM(jl.debit) as total
        FROM journal_lines jl
        JOIN accounts a ON jl."accountId" = a.id
        WHERE a."tenantId" = ${tenantId}
          AND a.type = 'EXPENSE'
        GROUP BY a.type
        ORDER BY total DESC
      `
    );
    return result;
  }

  async getInventorySummary(tenantId: string) {
    return this.prisma.$queryRaw<any[]>(
      Prisma.sql`
        SELECT
          p.category,
          COUNT(DISTINCT p.id)::int as product_count,
          SUM(i.quantity) as total_qty,
          SUM(i.quantity * i."costPrice") as total_value
        FROM products p
        JOIN inventory_items i ON i."productId" = p.id
        WHERE p."tenantId" = ${tenantId}
        GROUP BY p.category
        ORDER BY total_value DESC
      `
    );
  }

  async getProjectHealth(tenantId: string) {
    const projects = await this.prisma.project.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: {
        _count: { select: { tasks: true } },
        tasks: { where: { status: "DONE" }, select: { id: true } },
      },
    });

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      budget: Number(p.budget),
      actualCost: Number(p.actualCost),
      budgetUsed: Number(p.budget) > 0 ? (Number(p.actualCost) / Number(p.budget)) * 100 : 0,
      completion: p._count.tasks > 0 ? (p.tasks.length / p._count.tasks) * 100 : 0,
      status: p.status,
      daysLeft: Math.max(0, Math.ceil((p.endDate.getTime() - Date.now()) / 86400000)),
    }));
  }
}
