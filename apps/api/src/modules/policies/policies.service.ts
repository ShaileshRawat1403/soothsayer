import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface HandoffDecision {
  shouldHandoff: boolean;
  reason?: string;
  requireApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);
  private readonly ollamaModels = [
    'llama3.2:1b',
    'llama3.2',
    'llama3:8b',
    'llama3:70b',
    'phi3:mini',
    'mistral',
    'mixtral',
    'ministral',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async evaluateHandoff(workspaceId: string, input: string): Promise<HandoffDecision> {
    const normalized = input.trim().toLowerCase();

    const isCriticalPath = this.checkCriticalPath(normalized);

    if (isCriticalPath) {
      return {
        shouldHandoff: true,
        reason: 'Targeting protected system path',
        requireApproval: true,
        riskLevel: 'high',
      };
    }

    const aiClassificationEnabled = this.configService.get<boolean>(
      'POLICY_AI_CLASSIFICATION_ENABLED',
      false
    );
    if (aiClassificationEnabled) {
      try {
        const aiDecision = await this.evaluateHandoffWithAI(input);
        if (aiDecision) {
          return aiDecision;
        }
      } catch (error) {
        this.logger.warn(`AI classification failed, falling back to regex: ${error}`);
      }
    }

    return this.getLegacyRegexDecision(normalized);
  }

  private async evaluateHandoffWithAI(input: string): Promise<HandoffDecision | null> {
    const configuredModel = this.configService.get<string>('DAX_DEFAULT_MODEL', 'gemini-2.5-pro');
    const model = this.isOllamaModel(configuredModel) ? configuredModel : 'llama3.2:1b';
    const ollamaBaseUrl = this.configService.get<string>(
      'OLLAMA_BASE_URL',
      'http://127.0.0.1:11434'
    );

    const classificationPrompt = `Classify this user message into one of these categories:
- "chat": General conversation, questions, explanations, brainstorming, non-execution work
- "execution": Requests to create, modify, run, change, or deploy code/systems
- "analysis": Requests to inspect, review, scan, investigate, or understand existing code

Respond with only the category name (chat, execution, or analysis) on a single line.

User message: "${input.replace(/"/g, '\\"')}"`;

    try {
      const response = await fetch(`${ollamaBaseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: classificationPrompt }],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.status}`);
      }

      const data = (await response.json()) as { message?: { content?: string } };
      const category = data.message?.content?.trim().toLowerCase();

      this.logger.log(`AI classification result: ${category} for input: ${input.slice(0, 50)}...`);

      switch (category) {
        case 'execution':
          return {
            shouldHandoff: true,
            reason: 'AI-classified as execution request',
            requireApproval: true,
            riskLevel: 'medium',
          };
        case 'analysis':
          return {
            shouldHandoff: true,
            reason: 'AI-classified as analysis request',
            requireApproval: false,
            riskLevel: 'low',
          };
        case 'chat':
          return {
            shouldHandoff: false,
            requireApproval: false,
            riskLevel: 'low',
          };
        default:
          this.logger.warn(`Unrecognized AI classification: ${category}`);
          return null;
      }
    } catch (error) {
      throw new Error(`AI classification error: ${error}`);
    }
  }

  private isOllamaModel(model: string): boolean {
    return this.ollamaModels.some((m) => model.toLowerCase().includes(m.toLowerCase()));
  }

  private checkCriticalPath(input: string): boolean {
    const criticalKeywords = [
      'production',
      'prod',
      'main',
      'master',
      'security',
      'auth',
      'login',
      'password',
      'credential',
      'database',
      'config',
      '.env',
      'deployment',
    ];

    return criticalKeywords.some((keyword) => input.includes(keyword));
  }

  private getLegacyRegexDecision(normalized: string): HandoffDecision {
    const lightweightGreetings =
      /^(hi|hello|hey|yo|hola|sup|what'?s up|how are you|thanks|thank you|ok|okay|cool|nice|bye|goodbye)[!.? ]*$/;
    const explicitExecutionPhrases = [
      'run this',
      'start a run',
      'open a live run',
      'execute this',
      'make this change',
      'apply this patch',
      'modify the file',
      'edit the file',
      'inspect the repo',
      'check the codebase',
      'fix the bug',
      'debug the issue',
    ];

    const executionVerbs =
      /(create|modify|edit|update|patch|run|execute|inspect|scan|fix|debug|append|write)\b/;
    const executionTargets =
      /(repo|repository|codebase|file|files|project|workspace|command|shell|patch)\b/;
    const nonExecutionPrompts =
      /^(explain|what is|how does|summarize|rewrite|brainstorm|translate|review)\b/;

    if (lightweightGreetings.test(normalized)) {
      return { shouldHandoff: false, requireApproval: false, riskLevel: 'low' };
    }

    if (nonExecutionPrompts.test(normalized)) {
      return { shouldHandoff: false, requireApproval: false, riskLevel: 'low' };
    }

    const isMatch =
      explicitExecutionPhrases.some((p) => normalized.includes(p)) ||
      (executionVerbs.test(normalized) && executionTargets.test(normalized));

    return {
      shouldHandoff: isMatch,
      requireApproval: isMatch, // Default to true for safety in control-plane
      riskLevel: 'medium',
    };
  }

  async isApprovalRequired(
    workspaceId: string,
    actionType: string,
    context: any
  ): Promise<boolean> {
    // Basic logic for Sprint 4: Certain actions always require approval
    if (['write', 'execute', 'delete'].includes(actionType)) return true;

    // Check for high risk level in context
    if (context?.riskLevel === 'high' || context?.riskLevel === 'critical') return true;

    return false;
  }
}
