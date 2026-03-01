import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    if (workspaceIds.length === 0) {
      return { workflows: [], total: 0 };
    }

    const workflows = await this.prisma.workflow.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { runs: true },
        },
      },
      take: 100,
    });

    return {
      workflows: workflows.map((w) => ({
        id: w.id,
        workspaceId: w.workspaceId,
        name: w.name,
        slug: w.slug,
        description: w.description,
        status: w.status,
        trigger: w.trigger,
        steps: w.steps,
        templateCategory: w.templateCategory,
        isTemplate: w.isTemplate,
        runCount: w._count.runs,
        totalRuns: w.totalRuns,
        successfulRuns: w.successfulRuns,
        failedRuns: w.failedRuns,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
      total: workflows.length,
    };
  }

  async findOne(id: string, userId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!workflow || workflow.deletedAt) {
      throw new NotFoundException('Workflow not found');
    }

    await this.ensureWorkspaceAccess(workflow.workspaceId, userId);

    return workflow;
  }

  async updateStatus(
    id: string,
    userId: string,
    status: 'draft' | 'active' | 'paused' | 'archived',
  ) {
    const workflow = await this.prisma.workflow.findUnique({ where: { id } });
    if (!workflow || workflow.deletedAt) {
      throw new NotFoundException('Workflow not found');
    }

    await this.ensureWorkspaceAccess(workflow.workspaceId, userId);

    return this.prisma.workflow.update({
      where: { id },
      data: { status },
    });
  }

  async run(
    id: string,
    userId: string,
    options: { inputs?: Record<string, unknown>; projectId?: string; conversationId?: string },
  ) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { workspace: true },
    });
    if (!workflow || workflow.deletedAt) {
      throw new NotFoundException('Workflow not found');
    }
    await this.ensureWorkspaceAccess(workflow.workspaceId, userId);

    const now = new Date();
    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        workspaceId: workflow.workspaceId,
        workflowVersion: workflow.version,
        triggeredBy: { type: 'manual', userId },
        status: 'running',
        inputs: (options.inputs || {}) as any,
        variables: {},
        metadata: { source: 'api', mode: 'inline-execution' },
        startedAt: now,
        projectId: options.projectId,
        conversationId: options.conversationId,
        userId,
      },
    });

    const startedAt = Date.now();
    const steps = Array.isArray(workflow.steps) ? (workflow.steps as Array<Record<string, any>>) : [];

    try {
      for (const step of steps) {
        const stepId = String(step.id || `step-${Math.random().toString(36).slice(2, 8)}`);
        const stepName = String(step.name || stepId);
        const stepStart = Date.now();

        const createdStep = await this.prisma.workflowStepRun.create({
          data: {
            workflowRunId: run.id,
            stepId,
            stepName,
            status: 'running',
            inputs: {},
            startedAt: new Date(),
            logs: [{ at: new Date().toISOString(), message: `Started ${stepName}` }],
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 120));

        await this.prisma.workflowStepRun.update({
          where: { id: createdStep.id },
          data: {
            status: 'completed',
            outputs: { ok: true, simulated: true },
            logs: [
              { at: new Date().toISOString(), message: `Started ${stepName}` },
              { at: new Date().toISOString(), message: `Completed ${stepName}` },
            ],
            completedAt: new Date(),
            durationMs: Date.now() - stepStart,
          },
        });
      }

      const durationMs = Date.now() - startedAt;
      const completed = await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          outputs: { completedSteps: steps.length, ok: true },
          completedAt: new Date(),
          durationMs,
        },
      });

      await this.prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          totalRuns: { increment: 1 },
          successfulRuns: { increment: 1 },
          lastRunAt: new Date(),
          avgDurationMs:
            workflow.totalRuns > 0
              ? ((workflow.avgDurationMs * workflow.totalRuns) + durationMs) / (workflow.totalRuns + 1)
              : durationMs,
        },
      });

      return completed;
    } catch (error) {
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
          completedAt: new Date(),
          durationMs: Date.now() - startedAt,
        },
      });

      await this.prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          totalRuns: { increment: 1 },
          failedRuns: { increment: 1 },
          lastRunAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async ensureWorkspaceAccess(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }
}
