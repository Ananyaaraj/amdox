import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(private prisma: PrismaService) {}

  async processPayrollRun(payrollRunId: string, tenantId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: "ACTIVE" },
    });

    let totalGross = 0;
    let totalNet = 0;

    for (const emp of employees) {
      const gross = Number(emp.baseSalary);

      // Tax slabs (simplified - configurable in production)
      const tax = this.calculateTax(gross);
      const providentFund = gross * 0.12;
      const net = gross - tax - providentFund;

      totalGross += gross;
      totalNet += net;

      await this.prisma.payrollEmployee.create({
        data: {
          payrollRunId,
          employeeId: emp.id,
          grossSalary: gross,
          deductions: { tax, providentFund },
          netSalary: net,
        },
      });
    }

    await this.prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: "COMPLETED",
        totalGross,
        totalNet,
        processedAt: new Date(),
      },
    });

    this.logger.log(`Payroll run ${payrollRunId} completed: ${employees.length} employees`);
  }

  private calculateTax(annualSalary: number): number {
    // Simplified progressive tax (monthly)
    const monthly = annualSalary / 12;
    if (monthly <= 3000) return 0;
    if (monthly <= 6000) return (monthly - 3000) * 0.1;
    if (monthly <= 12000) return 300 + (monthly - 6000) * 0.2;
    return 1500 + (monthly - 12000) * 0.3;
  }
}
