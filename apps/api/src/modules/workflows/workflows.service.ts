import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultTemplates: Array<{
    name: string;
    slug: string;
    description: string;
    trigger: Record<string, unknown>;
    templateCategory: string;
    steps: Array<Record<string, unknown>>;
  }> = [
    {
      name: 'Release Checklist',
      slug: 'release-checklist',
      description: 'Pre-release verification workflow for build, test, and deployment checks.',
      trigger: { type: 'manual' },
      templateCategory: 'engineering',
      steps: [
        { id: 'validate-branch', name: 'Validate branch state', type: 'validation', risk: 'read' },
        { id: 'run-tests', name: 'Run test suite', type: 'task', task: 'test', risk: 'execute' },
        { id: 'build-artifacts', name: 'Build artifacts', type: 'task', task: 'build', risk: 'execute' },
      ],
    },
    {
      name: 'Bug Triage',
      slug: 'bug-triage',
      description: 'Triage incoming issues and generate a normalized severity summary.',
      trigger: { type: 'webhook', event: 'issue.created' },
      templateCategory: 'operations',
      steps: [
        { id: 'collect-context', name: 'Collect issue context', type: 'read', risk: 'read' },
        { id: 'classify-severity', name: 'Classify severity', type: 'analysis', risk: 'read' },
        { id: 'notify-team', name: 'Notify owners', type: 'notification', risk: 'write' },
      ],
    },
    {
      name: 'Daily Standup Summary',
      slug: 'daily-standup-summary',
      description: 'Summarize team updates and blockers on a fixed schedule.',
      trigger: { type: 'scheduled', cron: '0 10 * * 1-5' },
      templateCategory: 'team',
      steps: [
        { id: 'collect-updates', name: 'Collect updates', type: 'read', risk: 'read' },
        { id: 'summarize-blockers', name: 'Summarize blockers', type: 'analysis', risk: 'read' },
        { id: 'publish-summary', name: 'Publish summary', type: 'write', risk: 'write' },
      ],
    },
  ];

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
    const runStartedAt = Date.now();
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

      this.logger.log(
        `Workflow "${workflow.slug}" run completed in ${Date.now() - runStartedAt}ms`,
      );

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

      this.logger.warn(
        `Workflow "${workflow.slug}" run failed in ${Date.now() - runStartedAt}ms: ${error instanceof Error ? error.message : String(error)}`,
      );

      throw error;
    }
  }

  async bootstrapTemplates(userId: string, workspaceId?: string) {
    const targetWorkspaceId = workspaceId || (await this.resolveDefaultWorkspaceId(userId));
    await this.ensureWorkspaceAccess(targetWorkspaceId, userId);

    let created = 0;
    for (const template of this.defaultTemplates) {
      const existing = await this.prisma.workflow.findFirst({
        where: {
          workspaceId: targetWorkspaceId,
          slug: template.slug,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      await this.prisma.workflow.create({
        data: {
          workspaceId: targetWorkspaceId,
          createdById: userId,
          name: template.name,
          slug: template.slug,
          description: template.description,
          status: 'active',
          trigger: template.trigger as any,
          steps: template.steps as any,
          variables: [],
          errorHandling: {},
          metadata: { source: 'bootstrap-template' },
          isTemplate: true,
          templateCategory: template.templateCategory,
        },
      });
      created += 1;
    }

    this.logger.log(
      `Workflow template bootstrap completed for workspace ${targetWorkspaceId} (created=${created})`,
    );
    return { workspaceId: targetWorkspaceId, created };
  }

  private async resolveDefaultWorkspaceId(userId: string): Promise<string> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!membership?.workspaceId) {
      throw new NotFoundException('No workspace found for current user');
    }
    return membership.workspaceId;
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
