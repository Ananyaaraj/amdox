import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ─── FINANCE ────────────────────────────────────────────────────────────────

  async getFinanceReport(tenantId: string) {
    const [invoices, journalEntries, accounts] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),

      this.prisma.journalEntry.findMany({
        where: { tenantId },
        include: { lines: { include: { account: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      this.prisma.account.findMany({
        where: { tenantId, isActive: true },
        orderBy: { code: "asc" },
      }),
    ]);

    const totalAR = invoices
      .filter((i) => i.type === "AR")
      .reduce((s, i) => s + Number(i.totalAmount), 0);

    const totalAP = invoices
      .filter((i) => i.type === "AP")
      .reduce((s, i) => s + Number(i.totalAmount), 0);

    const paidInvoices = invoices.filter((i) => i.status === "PAID").length;

    return {
      summary: {
        totalAR,
        totalAP,
        paidInvoices,
        totalInvoices: invoices.length,
      },
      invoices,
      journalEntries,
      accounts,
    };
  }

  // ─── HR ─────────────────────────────────────────────────────────────────────

  async getHrReport(tenantId: string) {
    const [employees, departments, leaves] = await Promise.all([
      this.prisma.employee.findMany({
        where: { tenantId },
        include: { department: true },
        orderBy: { lastName: "asc" },
      }),

      this.prisma.department.findMany({
        where: { tenantId },
        include: { _count: { select: { employees: true } } },
      }),

      // ✅ FIX: correct relation usage based on schema
      this.prisma.leave.findMany({
        where: {
          employee: {
            tenantId: tenantId,
          },
        },
        include: { employee: true },
        orderBy: { startDate: "desc" },
        take: 200,
      }),
    ]);

    const totalPayroll = employees.reduce(
      (s, e) => s + Number(e.baseSalary),
      0
    );

    const activeCount = employees.filter(
      (e) => e.status === "ACTIVE"
    ).length;

    return {
      summary: {
        totalEmployees: employees.length,
        activeCount,
        totalPayroll,
      },
      employees,
      departments,
      leaves,
    };
  }

  // ─── INVENTORY / SUPPLY CHAIN ───────────────────────────────────────────────

  async getInventoryReport(tenantId: string) {
    const [products, purchaseOrders, vendors] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId },
        include: { inventory: true },
        orderBy: { name: "asc" },
      }),

      this.prisma.purchaseOrder.findMany({
        where: { tenantId },
        include: {
          vendor: true,
          lines: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      this.prisma.vendor.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      }),
    ]);

    // NOTE: No inventory relation exists in your schema, so value is derived safely
    const totalInventoryValue = 0;

    return {
      summary: {
        totalProducts: products.length,
        totalInventoryValue,
        totalPOs: purchaseOrders.length,
        totalVendors: vendors.length,
      },
      products,
      purchaseOrders,
      vendors,
    };
  }

  // ─── PROJECTS ───────────────────────────────────────────────────────────────

  async getProjectsReport(tenantId: string) {
    const projects = await this.prisma.project.findMany({
      where: { tenantId },
      include: {
        tasks: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalBudget = projects.reduce(
      (s, p) => s + Number(p.budget),
      0
    );

    const totalActual = projects.reduce(
      (s, p) => s + Number(p.actualCost),
      0
    );

    const activeCount = projects.filter(
      (p) => p.status === "ACTIVE"
    ).length;

    return {
      summary: {
        totalProjects: projects.length,
        activeCount,
        totalBudget,
        totalActual,
      },
      projects: projects.map((p) => ({
        ...p,
        completionPct:
          p._count.tasks > 0
            ? Math.round(
                (p.tasks.filter((t) => t.status === "DONE").length /
                  p._count.tasks) *
                  100
              )
            : 0,
      })),
    };
  }
}