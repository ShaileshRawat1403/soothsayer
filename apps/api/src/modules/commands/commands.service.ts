import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { spawn } from 'child_process';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommandsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string, options: { category?: string; search?: string; page?: number; limit?: number } = {}) {
    const { category, search } = options;
    const page = Number.isFinite(options.page as number) && (options.page as number) > 0
      ? Math.floor(options.page as number)
      : 1;
    const limit = Number.isFinite(options.limit as number) && (options.limit as number) > 0
      ? Math.floor(options.limit as number)
      : 20;

    const where: Record<string, unknown> = { workspaceId, deletedAt: null };
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [commands, total] = await Promise.all([
      this.prisma.command.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.command.count({ where }),
    ]);

    return { commands, total, page, limit };
  }

  async findOne(id: string) {
    const command = await this.prisma.command.findUnique({ where: { id } });
    if (!command || command.deletedAt) throw new NotFoundException('Command not found');
    return command;
  }

  async execute(commandId: string, userId: string, workspaceId: string, options: {
    projectId?: string;
    parameters: Record<string, unknown>;
    tier?: number;
    personaId?: string;
    conversationId?: string;
    dryRun?: boolean;
  }) {
    const command = await this.findOne(commandId);

    // TODO: Evaluate policies
    // TODO: Check tier authorization
    // TODO: Create approval request if needed

    const resolvedCommand = this.resolveTemplate(command.template, options.parameters);

    if (options.dryRun) {
      return {
        resolvedCommand,
        policyResult: { allowed: true, matchedPolicies: [], requiredApprovals: [] },
        estimatedRisk: command.riskLevel,
        warnings: [],
      };
    }

    const execution = await this.prisma.commandExecution.create({
      data: {
        commandId,
        workspaceId,
        projectId: options.projectId,
        userId,
        personaId: options.personaId,
        conversationId: options.conversationId,
        tier: options.tier || 0,
        command: resolvedCommand,
        parameters: options.parameters as any,
        status: 'pending',
        output: {},
      },
    });

    const startedAt = Date.now();
    await this.prisma.commandExecution.update({
      where: { id: execution.id },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    const result = await this.runCommandWithGuards(
      resolvedCommand,
      command.timeout || 30000,
      process.cwd(),
    );

    const finalStatus = result.exitCode === 0 ? 'completed' : 'failed';
    const completed = await this.prisma.commandExecution.update({
      where: { id: execution.id },
      data: {
        status: finalStatus,
        output: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          truncated: result.truncated,
        } as any,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt,
      },
    });

    return {
      execution: completed,
      requiresApproval: command.requiresApproval,
      policyResult: { allowed: true, matchedPolicies: [], requiredApprovals: [] },
    };
  }

  async executeTerminal(userId: string, workspaceId: string, command: string, cwd?: string) {
    await this.ensureWorkspaceAccess(workspaceId, userId);

    const trimmed = (command || '').trim();
    if (!trimmed) {
      throw new ForbiddenException('Command is required');
    }
    if (trimmed.length > 500) {
      throw new ForbiddenException('Command is too long');
    }

    const result = await this.runCommandWithGuards(trimmed, 30000, cwd || process.cwd());
    return {
      command: trimmed,
      status: result.exitCode === 0 ? 'completed' : 'failed',
      output: result.stdout,
      errorOutput: result.stderr,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      truncated: result.truncated,
    };
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

  private isDangerousCommand(command: string): boolean {
    const blockedPatterns = [
      /(^|\s)sudo(\s|$)/i,
      /rm\s+-rf\s+\//i,
      /\bmkfs\b/i,
      /\bdd\b/i,
      /\bshutdown\b/i,
      /\breboot\b/i,
      />\s*\/dev\//i,
      /\bcurl\b.*\|\s*(sh|bash|zsh)/i,
      /\bwget\b.*\|\s*(sh|bash|zsh)/i,
    ];
    return blockedPatterns.some((p) => p.test(command));
  }

  private runCommandWithGuards(
    command: string,
    timeoutMs: number,
    cwd: string,
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
    timedOut: boolean;
    truncated: boolean;
  }> {
    if (this.isDangerousCommand(command)) {
      throw new ForbiddenException('Command blocked by security policy');
    }

    const maxBytes = 100_000;

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const child = spawn('/bin/sh', ['-lc', command], {
        cwd,
        env: {
          PATH: process.env.PATH || '',
          HOME: process.env.HOME || '',
        },
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let truncated = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        const next = stdout + chunk.toString('utf8');
        if (next.length > maxBytes) {
          stdout = next.slice(0, maxBytes);
          truncated = true;
          return;
        }
        stdout = next;
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const next = stderr + chunk.toString('utf8');
        if (next.length > maxBytes) {
          stderr = next.slice(0, maxBytes);
          truncated = true;
          return;
        }
        stderr = next;
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: timedOut ? 124 : (code ?? 1),
          durationMs: Date.now() - startedAt,
          timedOut,
          truncated,
        });
      });
    });
  }

  private resolveTemplate(template: string, parameters: Record<string, unknown>): string {
    let resolved = template;
    for (const [key, value] of Object.entries(parameters)) {
      resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
    return resolved;
  }
}
