import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantId, CurrentUser } from "../../common/decorators";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: "Create project" })
  createProject(@TenantId() tenantId: string, @Body() dto: any) {
    return this.projectsService.createProject(tenantId, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update project" })
  updateProject(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: any
  ) {
    return this.projectsService.updateProject(tenantId, id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List projects" })
  getProjects(@TenantId() tenantId: string, @Query("status") status?: string) {
    return this.projectsService.getProjects(tenantId, status);
  }

  @Get("tasks/my")
  @ApiOperation({ summary: "Get tasks assigned to current employee" })
  getMyTasks(@TenantId() tenantId: string, @CurrentUser("email") email: string) {
    return this.projectsService.getMyTasks(tenantId, email);
  }

  @Get(":id")
  getProject(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.projectsService.getProject(tenantId, id);
  }

  @Get(":id/gantt")
  @ApiOperation({ summary: "Get Gantt chart data" })
  getGanttData(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.projectsService.getGanttData(tenantId, id);
  }

  @Post(":id/milestones")
  createMilestone(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: any) {
    return this.projectsService.createMilestone(tenantId, id, dto);
  }

  @Post(":id/tasks")
  createTask(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: any) {
    return this.projectsService.createTask(tenantId, id, dto);
  }

  @Put("tasks/:taskId")
  updateTask(@TenantId() tenantId: string, @Param("taskId") taskId: string, @Body() dto: any) {
    return this.projectsService.updateTask(tenantId, taskId, dto);
  }
}
