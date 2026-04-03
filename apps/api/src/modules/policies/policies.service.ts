import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly prisma: PrismaService) {}

  async evaluateHandoff(workspaceId: string, input: string): Promise<HandoffDecision> {
    const normalized = input.trim().toLowerCase();
    
    // 1. Fetch active policies for workspace
    const policies = await this.prisma.policy.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { priority: 'asc' },
    });

    // 2. Default hardcoded fallback (the old regex logic, but structured)
    const defaultDecision = this.getLegacyRegexDecision(normalized);

    // 3. TODO: In a full implementation, we would iterate through `policies` and evaluate `rules` (JSON)
    // For Sprint 4, we'll implement the "Critical Paths" logic which is a core requirement.
    
    const isCriticalPath = this.checkCriticalPath(normalized);
    
    if (isCriticalPath) {
      return {
        shouldHandoff: true,
        reason: 'Targeting protected system path',
        requireApproval: true,
        riskLevel: 'high',
      };
    }

    return defaultDecision;
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
    
    return criticalKeywords.some(keyword => input.includes(keyword));
  }

  private getLegacyRegexDecision(normalized: string): HandoffDecision {
    const lightweightGreetings =
      /^(hi|hello|hey|yo|hola|sup|what'?s up|how are you|thanks|thank you|ok|okay|cool|nice|bye|goodbye)[!.? ]*$/;
    const explicitExecutionPhrases = [
      'run this', 'start a run', 'open a live run', 'execute this',
      'make this change', 'apply this patch', 'modify the file', 'edit the file',
      'inspect the repo', 'check the codebase', 'fix the bug', 'debug the issue',
    ];

    const executionVerbs = /(create|modify|edit|update|patch|run|execute|inspect|scan|fix|debug|append|write)\b/;
    const executionTargets = /(repo|repository|codebase|file|files|project|workspace|command|shell|patch)\b/;
    const nonExecutionPrompts = /^(explain|what is|how does|summarize|rewrite|brainstorm|translate|review)\b/;

    if (lightweightGreetings.test(normalized)) {
      return { shouldHandoff: false, requireApproval: false, riskLevel: 'low' };
    }

    if (nonExecutionPrompts.test(normalized)) {
      return { shouldHandoff: false, requireApproval: false, riskLevel: 'low' };
    }

    const isMatch = explicitExecutionPhrases.some(p => normalized.includes(p)) || 
                   (executionVerbs.test(normalized) && executionTargets.test(normalized));

    return {
      shouldHandoff: isMatch,
      requireApproval: isMatch, // Default to true for safety in control-plane
      riskLevel: 'medium',
    };
  }

  async isApprovalRequired(workspaceId: string, actionType: string, context: any): Promise<boolean> {
    // Basic logic for Sprint 4: Certain actions always require approval
    if (['write', 'execute', 'delete'].includes(actionType)) return true;
    
    // Check for high risk level in context
    if (context?.riskLevel === 'high' || context?.riskLevel === 'critical') return true;

    return false;
  }
}
