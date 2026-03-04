import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type ToolRow = {
  id: string;
  status: string;
  [key: string]: unknown;
};

type ToolConfigRow = {
  toolId: string;
  enabled: boolean;
  customConfig: unknown;
  overrides: unknown;
};

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, workspaceId?: string) {
    if (workspaceId) {
      await this.ensureWorkspaceAccess(workspaceId, userId);
    }

    const tools = (await this.prisma.tool.findMany({
      where: { status: { not: 'disabled' } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })) as ToolRow[];

    if (!workspaceId) {
      return { tools };
    }

    const configs = (await this.prisma.toolConfiguration.findMany({
      where: { workspaceId },
      select: {
        toolId: true,
        enabled: true,
        customConfig: true,
        overrides: true,
      },
    })) as ToolConfigRow[];

    const configByToolId = new Map(
      configs.map((config: ToolConfigRow) => [config.toolId, config] as const)
    );
    return {
      tools: tools.map((tool: ToolRow) => ({
        ...tool,
        workspaceConfig: configByToolId.get(tool.id) || null,
      })),
    };
  }

  async findOne(id: string, userId: string, workspaceId?: string) {
    if (workspaceId) {
      await this.ensureWorkspaceAccess(workspaceId, userId);
    }

    const tool = await this.prisma.tool.findUnique({
      where: { id },
    });

    if (!tool || tool.status === 'disabled') {
      throw new NotFoundException('Tool not found');
    }

    if (!workspaceId) {
      return tool;
    }

    const workspaceConfig = await this.prisma.toolConfiguration.findUnique({
      where: {
        toolId_workspaceId: {
          toolId: id,
          workspaceId,
        },
      },
      select: {
        enabled: true,
        customConfig: true,
        overrides: true,
      },
    });

    return {
      ...tool,
      workspaceConfig,
    };
  }

  private async ensureWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }
}
