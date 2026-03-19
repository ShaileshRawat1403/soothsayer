import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DaxService } from '../dax/dax.service';
import type { DaxCreateRunRequest, DaxPersonaPreset, DaxRunStatus, DaxRunSummary } from '../dax/dax.types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly daxService: DaxService,
  ) {}

  private readonly daxPollIntervalMs = 1500;
  private readonly daxPollTimeoutMs = 15 * 60 * 1000;

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

  private asWorkflowUser(userId: string): CurrentUser {
    return {
      id: userId,
      email: 'workflow@soothsayer.local',
      name: 'Workflow Runner',
    };
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m: { workspaceId: string }) => m.workspaceId);

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
      workflows: workflows.map((w: (typeof workflows)[number]) => ({
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

  async create(
    userId: string,
    dto: {
      workspaceId?: string;
      name: string;
      description?: string;
      trigger?: Record<string, unknown>;
      steps?: Array<Record<string, unknown>>;
      status?: 'draft' | 'active' | 'paused' | 'archived';
      templateCategory?: string;
    },
  ) {
    const workspaceId = dto.workspaceId || (await this.resolveDefaultWorkspaceId(userId));
    await this.ensureWorkspaceAccess(workspaceId, userId);

    const name = (dto.name || '').trim();
    if (!name) {
      throw new BadRequestException('Workflow name is required');
    }

    const baseSlug = this.generateSlug(name);
    const slug = await this.ensureUniqueSlug(workspaceId, baseSlug);

    return this.prisma.workflow.create({
      data: {
        workspaceId,
        createdById: userId,
        name,
        slug,
        description: dto.description?.trim() || null,
        status: dto.status || 'draft',
        trigger: (dto.trigger || { type: 'manual' }) as any,
        steps: this.normalizeSteps(dto.steps || []) as any,
        variables: [],
        errorHandling: {},
        metadata: { source: 'ui-builder' },
        isTemplate: false,
        templateCategory: dto.templateCategory || null,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    dto: {
      name?: string;
      description?: string;
      trigger?: Record<string, unknown>;
      steps?: Array<Record<string, unknown>>;
      status?: 'draft' | 'active' | 'paused' | 'archived';
    },
  ) {
    const workflow = await this.prisma.workflow.findUnique({ where: { id } });
    if (!workflow || workflow.deletedAt) {
      throw new NotFoundException('Workflow not found');
    }

    await this.ensureWorkspaceAccess(workflow.workspaceId, userId);

    const nextName = dto.name?.trim();
    let nextSlug: string | undefined;
    if (nextName && nextName !== workflow.name) {
      const base = this.generateSlug(nextName);
      nextSlug = await this.ensureUniqueSlug(workflow.workspaceId, base, workflow.id);
    }

    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...(nextName ? { name: nextName } : {}),
        ...(nextSlug ? { slug: nextSlug } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.trigger ? { trigger: dto.trigger as any } : {}),
        ...(dto.steps ? { steps: this.normalizeSteps(dto.steps) as any } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.steps || dto.trigger || dto.name || dto.description !== undefined
          ? { version: { increment: 1 } }
          : {}),
      },
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
      const workflowRunDaxMetadata: Array<Record<string, unknown>> = [];

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

        if (String(step.type || 'task') === 'dax_run') {
          const daxResult = await this.executeDaxRunStep({
            userId,
            workflow,
            projectId: options.projectId,
            workflowRunId: run.id,
            workflowStepRunId: createdStep.id,
            stepId,
            stepName,
            step,
            stepStartedAt: stepStart,
          });

          workflowRunDaxMetadata.push({
            stepId,
            stepName,
            runId: daxResult.runId,
            status: daxResult.status,
            outcome: daxResult.summary.outcome?.result || daxResult.summary.status,
          });
          continue;
        }

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
          outputs: {
            completedSteps: steps.length,
            ok: true,
            daxRuns: workflowRunDaxMetadata,
            latestDaxRunId:
              workflowRunDaxMetadata.length > 0
                ? String(workflowRunDaxMetadata[workflowRunDaxMetadata.length - 1].runId)
                : undefined,
          } as any,
          metadata:
            workflowRunDaxMetadata.length > 0
              ? {
                  source: 'api',
                  mode: 'inline-execution',
                  daxRuns: workflowRunDaxMetadata,
                } as any
              : ({ source: 'api', mode: 'inline-execution' } as any),
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

  private normalizeSteps(steps: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return steps.map((step, idx) => ({
      id: String(step.id || `step-${idx + 1}`),
      name: String(step.name || `Step ${idx + 1}`),
      type: String(step.type || 'task'),
      risk: String(step.risk || 'read'),
      ...(step.task ? { task: String(step.task) } : {}),
      ...(step.input ? { input: step.input } : {}),
      ...(step.personaPreset &&
      typeof step.personaPreset === 'object' &&
      step.personaPreset !== null
        ? {
            personaPreset: {
              ...(typeof (step.personaPreset as Record<string, unknown>).personaId === 'string'
                ? { personaId: String((step.personaPreset as Record<string, unknown>).personaId) }
                : {}),
              ...(typeof (step.personaPreset as Record<string, unknown>).approvalMode === 'string'
                ? {
                    approvalMode: String(
                      (step.personaPreset as Record<string, unknown>).approvalMode,
                    ),
                  }
                : {}),
              ...(typeof (step.personaPreset as Record<string, unknown>).riskLevel === 'string'
                ? { riskLevel: String((step.personaPreset as Record<string, unknown>).riskLevel) }
                : {}),
            },
          }
        : {}),
    }));
  }

  private async executeDaxRunStep(params: {
    userId: string;
    workflow: {
      id: string;
      workspaceId: string;
      slug: string;
    };
    projectId?: string;
    workflowRunId: string;
    workflowStepRunId: string;
    stepId: string;
    stepName: string;
    step: Record<string, any>;
    stepStartedAt: number;
  }): Promise<{ runId: string; status: DaxRunStatus; summary: DaxRunSummary }> {
    const input = typeof params.step.input === 'string' ? params.step.input.trim() : '';
    if (!input) {
      throw new BadRequestException(`Workflow step "${params.stepName}" requires a DAX input`);
    }

    const personaPreset = this.normalizeDaxPersonaPreset(params.step.personaPreset);
    const createPayload: DaxCreateRunRequest = {
      intent: {
        input,
        kind: 'workflow_step',
      },
      ...(personaPreset ? { personaPreset } : {}),
      metadata: {
        source: 'soothsayer',
        workspaceId: params.workflow.workspaceId,
        projectId: params.projectId || undefined,
        workflowId: params.workflow.id,
      },
    };

    const createdRun = await this.daxService.createRun(this.asWorkflowUser(params.userId), createPayload);
    const initialLogs = [
      { at: new Date().toISOString(), message: `Started ${params.stepName}` },
      { at: new Date().toISOString(), message: `Delegated to DAX run ${createdRun.runId}` },
    ];

    await this.prisma.workflowStepRun.update({
      where: { id: params.workflowStepRunId },
      data: {
        inputs: {
          input,
          ...(personaPreset ? { personaPreset } : {}),
        } as any,
        outputs: {
          delegated: true,
          runId: createdRun.runId,
          status: createdRun.status,
        } as any,
        logs: initialLogs,
      },
    });

    await this.prisma.workflowRun.update({
      where: { id: params.workflowRunId },
      data: {
        metadata: {
          source: 'api',
          mode: 'inline-execution',
          latestDaxRunId: createdRun.runId,
          daxRuns: [
            {
              stepId: params.stepId,
              stepName: params.stepName,
              runId: createdRun.runId,
              status: createdRun.status,
            },
          ],
        } as any,
      },
    });

    const terminal = await this.waitForDaxTerminal(params.workflowRunId, params.workflowStepRunId, {
      runId: createdRun.runId,
      stepName: params.stepName,
      initialLogs,
      stepStartedAt: params.stepStartedAt,
    });

    if (terminal.status === 'completed') {
      return terminal;
    }

    throw new Error(
      terminal.summary.outcome?.summaryText ||
        `DAX run ${createdRun.runId} ended with status ${terminal.status}`,
    );
  }

  private normalizeDaxPersonaPreset(value: unknown): DaxPersonaPreset | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const personaId =
      typeof raw.personaId === 'string' && raw.personaId.trim()
        ? raw.personaId.trim()
        : undefined;

    if (!personaId) {
      return null;
    }

    return {
      personaId,
      ...(typeof raw.approvalMode === 'string'
        ? {
            approvalMode: raw.approvalMode as DaxPersonaPreset['approvalMode'],
          }
        : {}),
      ...(typeof raw.riskLevel === 'string'
        ? { riskLevel: raw.riskLevel as DaxPersonaPreset['riskLevel'] }
        : {}),
    };
  }

  private async waitForDaxTerminal(
    workflowRunId: string,
    workflowStepRunId: string,
    params: {
      runId: string;
      stepName: string;
      initialLogs: Array<{ at: string; message: string }>;
      stepStartedAt: number;
    },
  ): Promise<{ runId: string; status: DaxRunStatus; summary: DaxRunSummary }> {
    const startedAt = Date.now();
    let lastStatus: DaxRunStatus | null = null;

    while (Date.now() - startedAt < this.daxPollTimeoutMs) {
      const snapshot = await this.daxService.getRun(params.runId);

      if (snapshot.status !== lastStatus) {
        lastStatus = snapshot.status;
        await this.prisma.workflowStepRun.update({
          where: { id: workflowStepRunId },
          data: {
            status:
              snapshot.status === 'waiting_approval'
                ? 'waiting_approval'
                : snapshot.status === 'failed'
                  ? 'failed'
                  : snapshot.status === 'completed'
                    ? 'completed'
                    : 'running',
            outputs: {
              delegated: true,
              runId: params.runId,
              status: snapshot.status,
            } as any,
            logs: [
              ...params.initialLogs,
              {
                at: new Date().toISOString(),
                message: `DAX run status changed to ${snapshot.status}`,
              },
            ],
          },
        });

        await this.prisma.workflowRun.update({
          where: { id: workflowRunId },
          data: {
            status: snapshot.status === 'waiting_approval' ? 'waiting_approval' : 'running',
          },
        });
      }

      if (snapshot.status === 'completed' || snapshot.status === 'failed') {
        const summary = await this.daxService.getSummary(params.runId);
        await this.prisma.workflowStepRun.update({
          where: { id: workflowStepRunId },
          data: {
            status: snapshot.status === 'completed' ? 'completed' : 'failed',
            outputs: {
              delegated: true,
              runId: params.runId,
              status: snapshot.status,
              summary,
            } as any,
            error:
              snapshot.status === 'failed'
                ? {
                    message:
                      summary.outcome?.summaryText ||
                      `DAX run ${params.runId} failed`,
                  } as any
                : undefined,
            logs: [
              ...params.initialLogs,
              {
                at: new Date().toISOString(),
                message: `DAX run reached terminal status ${snapshot.status}`,
              },
            ],
            completedAt: new Date(),
            durationMs: Date.now() - params.stepStartedAt,
          },
        });

        return {
          runId: params.runId,
          status: snapshot.status,
          summary,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, this.daxPollIntervalMs));
    }

    throw new BadRequestException(
      `Timed out waiting for DAX run ${params.runId} to reach a terminal state`,
    );
  }

  private generateSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
  }

  private async ensureUniqueSlug(
    workspaceId: string,
    baseSlug: string,
    ignoreWorkflowId?: string,
  ): Promise<string> {
    const candidateBase = baseSlug || `workflow-${Date.now()}`;
    let attempt = 0;
    while (attempt < 20) {
      const candidate = attempt === 0 ? candidateBase : `${candidateBase}-${attempt + 1}`;
      const existing = await this.prisma.workflow.findFirst({
        where: {
          workspaceId,
          slug: candidate,
          deletedAt: null,
          ...(ignoreWorkflowId ? { id: { not: ignoreWorkflowId } } : {}),
        },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
      attempt += 1;
    }
    return `${candidateBase}-${Date.now()}`;
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
