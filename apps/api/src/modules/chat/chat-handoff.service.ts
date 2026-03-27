import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DaxService } from '../dax/dax.service';
import { PersonaMapperService } from './persona-mapper.service';
import { PoliciesService, HandoffDecision } from '../policies/policies.service';
import { DaxCreateRunRequest } from '@soothsayer/types';

@Injectable()
export class ChatHandoffService {
  private readonly logger = new Logger(ChatHandoffService.name);

  constructor(
    private prisma: PrismaService,
    private daxService: DaxService,
    private personaMapper: PersonaMapperService,
    private policiesService: PoliciesService,
  ) {}

  async evaluateHandoff(workspaceId: string, input: string): Promise<HandoffDecision> {
    return this.policiesService.evaluateHandoff(workspaceId, input);
  }

  async createDaxRunHandoff(
    conversation: {
      id: string;
      workspaceId: string;
      projectId?: string | null;
      personaId: string;
      persona?: { id?: string; name?: string; config?: unknown } | null;
      metadata?: unknown;
    },
    content: string,
    decision: HandoffDecision,
    options: {
      userId: string;
      provider?: string;
      model?: string;
    },
  ) {
    const personaPreset = this.personaMapper.buildDaxPersonaPreset(
      {
        id: conversation.personaId,
        name: conversation.persona?.name,
        config: conversation.persona?.config,
      },
      options,
    );

    // Merge policy decision into persona preset
    personaPreset.approvalMode = decision.requireApproval ? 'strict' : personaPreset.approvalMode;
    personaPreset.riskLevel = decision.riskLevel;

    const repoPath = await this.resolveChatRepoPath(
      conversation.workspaceId,
      conversation.projectId || undefined,
      conversation.metadata,
    );

    const request: DaxCreateRunRequest = {
      intent: {
        input: content,
        ...(repoPath ? { repoPath } : {}),
      },
      personaPreset,
      metadata: {
        source: 'soothsayer',
        workspaceId: conversation.workspaceId,
        projectId: conversation.projectId || undefined,
        chatId: conversation.id,
        policyReason: decision.reason,
        targeting: repoPath
          ? {
              mode: 'explicit_repo_path',
              repoPath,
            }
          : {
              mode: 'default_cwd',
            },
      },
    };

    const created = await this.daxService.createRun({ id: options.userId } as any, request);
    
    return {
      ...created,
      targeting: repoPath
        ? {
            mode: 'explicit_repo_path' as const,
            repoPath,
          }
        : {
            mode: 'default_cwd' as const,
          },
    };
  }

  private async resolveChatRepoPath(
    workspaceId: string,
    projectId?: string,
    conversationMetadata?: unknown,
  ): Promise<string | undefined> {
    const metadataRepoPath = this.extractRepoPathFromTargetingMetadata(conversationMetadata);
    if (metadataRepoPath) {
      return metadataRepoPath;
    }

    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId,
          deletedAt: null,
        },
        select: {
          rootPath: true,
          settings: true,
        },
      });

      const projectRepoPath =
        (typeof project?.rootPath === 'string' && project.rootPath.trim()
          ? project.rootPath.trim()
          : undefined) || this.extractRepoPathFromSettings(project?.settings);

      if (projectRepoPath) {
        return projectRepoPath;
      }
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },
      select: {
        settings: true,
      },
    });

    return this.extractRepoPathFromSettings(workspace?.settings);
  }

  private extractRepoPathFromTargetingMetadata(metadata: unknown): string | undefined {
    if (!metadata || typeof metadata !== 'object' || metadata === null) {
      return undefined;
    }

    const raw = metadata as Record<string, unknown>;
    const targeting =
      raw.targeting && typeof raw.targeting === 'object'
        ? (raw.targeting as Record<string, unknown>)
        : null;

    if (targeting && typeof targeting.repoPath === 'string' && targeting.repoPath.trim()) {
      return targeting.repoPath.trim();
    }

    return undefined;
  }

  private extractRepoPathFromSettings(settings: unknown): string | undefined {
    if (!settings || typeof settings !== 'object') {
      return undefined;
    }

    const raw = settings as Record<string, unknown>;
    const candidates = ['repoPath', 'defaultRepoPath', 'targetRepoPath'] as const;

    for (const key of candidates) {
      const value = raw[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }
}
