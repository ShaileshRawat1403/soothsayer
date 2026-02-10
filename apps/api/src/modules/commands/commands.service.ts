import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommandsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string, options: { category?: string; search?: string; page?: number; limit?: number } = {}) {
    const { category, search, page = 1, limit = 20 } = options;

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

    // TODO: Queue execution job
    
    return {
      execution,
      requiresApproval: command.requiresApproval,
      policyResult: { allowed: true, matchedPolicies: [], requiredApprovals: [] },
    };
  }

  private resolveTemplate(template: string, parameters: Record<string, unknown>): string {
    let resolved = template;
    for (const [key, value] of Object.entries(parameters)) {
      resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
    return resolved;
  }
}
