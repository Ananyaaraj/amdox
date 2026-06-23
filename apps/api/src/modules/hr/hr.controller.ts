import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Patch } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, TenantId, CurrentUser } from "../../common/decorators";
import { HrService } from "./hr.service";
import { CreateEmployeeDto } from "./dto/employee.dto";
import { CreateLeaveDto } from "./dto/leave.dto";

@ApiTags("hr")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("hr")
export class HrController {
  constructor(private hrService: HrService) {}

  // Departments
  @Get("departments")
  getDepartments(@TenantId() tenantId: string) {
    return this.hrService.getDepartments(tenantId);
  }

  // Employees
  @Post("employees")
  @Roles("MANAGER", "TENANT_ADMIN")
  @ApiOperation({ summary: "Create employee" })
  createEmployee(@TenantId() tenantId: string, @Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(tenantId, dto);
  }

  @Get("employees")
  @ApiOperation({ summary: "List employees" })
  getEmployees(
    @TenantId() tenantId: string,
    @Query("departmentId") departmentId?: string,
    @Query("status") status?: string
  ) {
    return this.hrService.getEmployees(tenantId, { departmentId, status });
  }

  @Get("employees/org-chart")
  @ApiOperation({ summary: "Get org chart" })
  getOrgChart(@TenantId() tenantId: string) {
    return this.hrService.getOrgChart(tenantId);
  }

  @Get("employees/:id")
  getEmployee(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.hrService.getEmployee(tenantId, id);
  }

  @Put("employees/:id")
  @Roles("MANAGER", "TENANT_ADMIN")
  updateEmployee(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: Partial<CreateEmployeeDto>
  ) {
    return this.hrService.updateEmployee(tenantId, id, dto);
  }

  // Attendance
  @Post("attendance/clock-in")
  @ApiOperation({ summary: "Clock in" })
  clockIn(@TenantId() tenantId: string, @Body("employeeId") employeeId: string) {
    return this.hrService.clockIn(tenantId, employeeId);
  }

  @Post("attendance/clock-out")
  @ApiOperation({ summary: "Clock out" })
  clockOut(@TenantId() tenantId: string, @Body("employeeId") employeeId: string) {
    return this.hrService.clockOut(tenantId, employeeId);
  }

  // Leaves
  @Post("employees/:id/leaves")
  @ApiOperation({ summary: "Apply for leave" })
  applyLeave(
    @TenantId() tenantId: string,
    @Param("id") employeeId: string,
    @Body() dto: CreateLeaveDto
  ) {
    return this.hrService.applyLeave(tenantId, employeeId, dto);
  }

  @Patch("leaves/:id/approve")
  @Roles("MANAGER", "TENANT_ADMIN")
  @ApiOperation({ summary: "Approve/reject leave" })
  approveLeave(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body("approved") approved: boolean,
    @CurrentUser("id") userId: string
  ) {
    return this.hrService.approveLeave(tenantId, id, userId, approved);
  }

  // Payroll
  @Post("payroll/run")
  @Roles("TENANT_ADMIN")
  @ApiOperation({ summary: "Trigger payroll run" })
  runPayroll(
    @TenantId() tenantId: string,
    @Body() body: { period: string; startDate: string; endDate: string }
  ) {
    return this.hrService.runPayroll(tenantId, body.period, body.startDate, body.endDate);
  }

  @Get("payroll/runs")
  @ApiOperation({ summary: "Get payroll run history" })
  getPayrollRuns(@TenantId() tenantId: string) {
    return this.hrService.getPayrollRuns(tenantId);
  }

  @Get("leaves")
  @ApiOperation({ summary: "Get all leave requests" })
  getLeaves(@TenantId() tenantId: string) {
    return this.hrService.getLeaves(tenantId);
  }

  @Get("attendance")
  @ApiOperation({ summary: "Get all attendance logs" })
  getAttendance(@TenantId() tenantId: string) {
    return this.hrService.getAttendance(tenantId);
  }
}
