import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService, private events: EventEmitter2) {}

  async createProject(tenantId: string, dto: any) {
    return this.prisma.project.create({
      data: {
        ...dto,
        tenantId,
        budget: dto.budget !== undefined ? Number(dto.budget) : 0,
        actualCost: dto.actualCost !== undefined ? Number(dto.actualCost) : 0,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async updateProject(tenantId: string, id: string, dto: any) {
    const project = await this.prisma.project.findFirst({ where: { id, tenantId } });
    if (!project) throw new Error("Project not found");

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        budget: dto.budget !== undefined ? Number(dto.budget) : undefined,
        actualCost: dto.actualCost !== undefined ? Number(dto.actualCost) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
      },
    });
  }

  async getProjects(tenantId: string, status?: string) {
    const projects = await this.prisma.project.findMany({
      where: { tenantId, ...(status && { status: status as any }) },
      include: {
        tasks: { select: { status: true } },
        milestones: { include: { _count: { select: { tasks: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      return { ...p, progress };
    });
  }

  async getProject(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        milestones: { include: { tasks: true } },
        tasks: { orderBy: { dueDate: "asc" } },
      },
    });
    if (!project) throw new NotFoundException("Project not found");

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t: any) => t.status === "DONE").length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate budget variance
    const variance = Number(project.actualCost) - Number(project.budget);
    const variancePct = (variance / Number(project.budget)) * 100;

    return { ...project, progress, budgetVariance: variance, budgetVariancePct: variancePct };
  }

  async createTask(tenantId: string, projectId: string, dto: any) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new NotFoundException("Project not found");

    const task = await this.prisma.task.create({
      data: {
        ...dto,
        projectId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      },
    });

    return task;
  }

  async updateTask(tenantId: string, taskId: string, dto: any) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { tenantId } },
    });
    if (!task) throw new NotFoundException("Task not found");

    const updated = await this.prisma.task.update({ where: { id: taskId }, data: dto });

    // Check budget overrun
    const project = await this.prisma.project.findUnique({ where: { id: task.projectId } });
    if (project && Number(project.actualCost) > Number(project.budget) * 1.1) {
      this.events.emit("project.budget-overrun", { project, tenantId });
    }

    return updated;
  }

  async getGanttData(tenantId: string, projectId: string) {
    const project = await this.getProject(tenantId, projectId);
    return {
      project,
      tasks: project.tasks.map((t: any) => ({
        id: t.id,
        name: t.title,
        start: t.startDate || project.startDate,
        end: t.dueDate || project.endDate,
        progress: t.status === "DONE" ? 100 : t.status === "IN_PROGRESS" ? 50 : 0,
        dependencies: t.parentId ? [t.parentId] : [],
        assignee: t.assigneeId,
      })),
    };
  }

  async getMyTasks(tenantId: string, userEmail: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, email: userEmail },
    });
    if (!employee) return [];

    return this.prisma.task.findMany({
      where: {
        assigneeId: employee.id,
        project: { tenantId },
      },
      include: {
        project: true,
      },
      orderBy: { dueDate: "asc" },
    });
  }

  async createMilestone(tenantId: string, projectId: string, dto: any) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new NotFoundException("Project not found");

    return this.prisma.milestone.create({
      data: { ...dto, projectId, dueDate: new Date(dto.dueDate) },
    });
  }
}
