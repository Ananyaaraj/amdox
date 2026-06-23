import { Injectable, NotFoundException, BadRequestException, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateEmployeeDto } from "./dto/employee.dto";
import { CreateLeaveDto } from "./dto/leave.dto";
import { LeaveStatus } from "@prisma/client";

@Injectable()
export class HrService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("payroll") private payrollQueue: Queue
  ) {}

  // =================== DEPARTMENTS ===================
  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
  }

  // =================== EMPLOYEES ===================
  async createEmployee(tenantId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        ...dto,
        tenantId,
        baseSalary: dto.baseSalary,
        startDate: new Date(dto.startDate),
      },
      include: { department: true },
    });
  }

  async getEmployees(tenantId: string, filters: { departmentId?: string; status?: string }) {
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        ...(filters.departmentId && { departmentId: filters.departmentId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: {
        department: true,
        manager: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }

  async getEmployee(tenantId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        manager: true,
        reports: true,
        leaves: { orderBy: { createdAt: "desc" }, take: 10 },
        attendances: { orderBy: { date: "desc" }, take: 30 },
      },
    });
    if (!emp) throw new NotFoundException("Employee not found");
    return emp;
  }

  async updateEmployee(tenantId: string, id: string, dto: Partial<CreateEmployeeDto>) {
    await this.getEmployee(tenantId, id);
    return this.prisma.employee.update({ where: { id }, data: dto as any });
  }

  // =================== ORG CHART ===================
  async getOrgChart(tenantId: string) {
    const employees = await this.prisma.$queryRaw<any[]>`
      WITH RECURSIVE org_tree AS (
        SELECT e.id, e."firstName", e."lastName", e."jobTitle", e."managerId",
               e."departmentId", 0 as depth
        FROM employees e
        WHERE e."tenantId" = ${tenantId} AND e."managerId" IS NULL AND e."deletedAt" IS NULL
        UNION ALL
        SELECT e.id, e."firstName", e."lastName", e."jobTitle", e."managerId",
               e."departmentId", ot.depth + 1
        FROM employees e
        INNER JOIN org_tree ot ON e."managerId" = ot.id
        WHERE e."deletedAt" IS NULL
      )
      SELECT * FROM org_tree ORDER BY depth, "lastName"
    `;
    return employees;
  }

  // =================== LEAVES ===================
  async applyLeave(tenantId: string, employeeId: string, dto: CreateLeaveDto) {
    const emp = await this.getEmployee(tenantId, employeeId);
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return this.prisma.leave.create({
      data: {
        employeeId: emp.id,
        leaveType: dto.leaveType as any,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason,
        status: LeaveStatus.PENDING,
      },
    });
  }

  async approveLeave(tenantId: string, leaveId: string, approverId: string, approved: boolean) {
    const leave = await this.prisma.leave.findFirst({
      where: { id: leaveId, employee: { tenantId } },
    });
    if (!leave) throw new NotFoundException("Leave request not found");

    return this.prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: approved ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });
  }

  // =================== ATTENDANCE ===================
  async clockIn(tenantId: string, employeeId: string) {
    const emp = await this.getEmployee(tenantId, employeeId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: emp.id, date: today } },
    });
    if (existing?.clockIn) throw new BadRequestException("Already clocked in today");

    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: emp.id, date: today } },
      create: { employeeId: emp.id, date: today, clockIn: new Date() },
      update: { clockIn: new Date() },
    });
  }

  async clockOut(tenantId: string, employeeId: string) {
    const emp = await this.getEmployee(tenantId, employeeId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: emp.id, date: today } },
    });
    if (!record?.clockIn) throw new BadRequestException("No clock-in record found");

    const clockOut = new Date();
    const hoursWorked = (clockOut.getTime() - record.clockIn!.getTime()) / (1000 * 60 * 60);
    const overtime = Math.max(0, hoursWorked - 8);

    return this.prisma.attendance.update({
      where: { employeeId_date: { employeeId: emp.id, date: today } },
      data: { clockOut, hoursWorked, overtime },
    });
  }

  // =================== PAYROLL ===================
  async runPayroll(tenantId: string, period: string, startDate: string, endDate: string) {
    const payrollRun = await this.prisma.payrollRun.create({
      data: {
        tenantId,
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "PROCESSING",
      },
    });

    await this.payrollQueue.add(
      "process-payroll",
      { payrollRunId: payrollRun.id, tenantId },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );

    return payrollRun;
  }

  async getPayrollRuns(tenantId: string) {
    return this.prisma.payrollRun.findMany({
      where: { tenantId },
      include: { employees: { include: { employee: true } } },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
  }

  async getLeaves(tenantId: string) {
    return this.prisma.leave.findMany({
      where: {
        employee: {
          tenantId,
        },
      },
      include: {
        employee: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getAttendance(tenantId: string) {
    return this.prisma.attendance.findMany({
      where: {
        employee: {
          tenantId,
        },
      },
      include: {
        employee: true,
      },
      orderBy: {
        date: "desc",
      },
    });
  }
}
