import { z } from 'zod';

// Persona Schema
export const PersonaConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  category: z.enum([
    'Engineering',
    'Business',
    'Data',
    'Security',
    'Operations',
    'Meta',
  ]),
  description: z.string(),
  icon: z.string(),
  color: z.string(),
  systemPrompt: z.string(),
  modelConfig: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(32000).default(4096),
    topP: z.number().min(0).max(1).default(1),
    frequencyPenalty: z.number().min(-2).max(2).default(0),
    presencePenalty: z.number().min(-2).max(2).default(0),
  }),
  capabilities: z.array(z.string()),
  preferredTools: z.array(z.string()),
  restrictions: z.array(z.string()),
  responseStyle: z.object({
    tone: z.enum(['formal', 'casual', 'technical', 'friendly']),
    verbosity: z.enum(['concise', 'balanced', 'detailed']),
    formatting: z.array(z.enum(['markdown', 'code', 'lists', 'tables'])),
  }),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  approvalRequired: z.boolean().default(false),
  version: z.number().default(1),
});

export type PersonaConfig = z.infer<typeof PersonaConfigSchema>;

// Persona Engine
export class PersonaEngine {
  private personas: Map<string, PersonaConfig> = new Map();
  private activePersonaId: string | null = null;

  constructor() {
    this.loadDefaultPersonas();
  }

  private loadDefaultPersonas(): void {
    DEFAULT_PERSONAS.forEach((persona) => {
      this.personas.set(persona.id, persona);
    });
  }

  getPersona(id: string): PersonaConfig | undefined {
    return this.personas.get(id);
  }

  getAllPersonas(): PersonaConfig[] {
    return Array.from(this.personas.values());
  }

  getPersonasByCategory(category: string): PersonaConfig[] {
    return this.getAllPersonas().filter((p) => p.category === category);
  }

  setActivePersona(id: string): boolean {
    if (this.personas.has(id)) {
      this.activePersonaId = id;
      return true;
    }
    return false;
  }

  getActivePersona(): PersonaConfig | undefined {
    return this.activePersonaId ? this.personas.get(this.activePersonaId) : undefined;
  }

  addCustomPersona(config: PersonaConfig): void {
    const validated = PersonaConfigSchema.parse(config);
    this.personas.set(validated.id, validated);
  }

  recommendPersona(context: string): { persona: PersonaConfig; confidence: number } | null {
    const contextLower = context.toLowerCase();
    
    // Simple keyword-based recommendation
    const recommendations: Array<{ persona: PersonaConfig; score: number }> = [];
    
    this.personas.forEach((persona) => {
      let score = 0;
      
      // Check capabilities match
      persona.capabilities.forEach((cap) => {
        if (contextLower.includes(cap.toLowerCase())) {
          score += 10;
        }
      });
      
      // Check category-specific keywords
      if (persona.category === 'Engineering') {
        const engineeringKeywords = ['code', 'bug', 'api', 'database', 'deploy', 'test', 'debug'];
        engineeringKeywords.forEach((kw) => {
          if (contextLower.includes(kw)) score += 5;
        });
      }
      
      if (persona.category === 'Business') {
        const businessKeywords = ['product', 'roadmap', 'stakeholder', 'requirement', 'strategy'];
        businessKeywords.forEach((kw) => {
          if (contextLower.includes(kw)) score += 5;
        });
      }
      
      if (persona.category === 'Security') {
        const securityKeywords = ['security', 'vulnerability', 'audit', 'compliance', 'pii'];
        securityKeywords.forEach((kw) => {
          if (contextLower.includes(kw)) score += 5;
        });
      }
      
      if (score > 0) {
        recommendations.push({ persona, score });
      }
    });
    
    if (recommendations.length === 0) {
      // Return Auto persona as default
      const autoPersona = this.personas.get('auto');
      return autoPersona ? { persona: autoPersona, confidence: 0.5 } : null;
    }
    
    // Sort by score and return highest
    recommendations.sort((a, b) => b.score - a.score);
    const best = recommendations[0];
    const maxPossibleScore = 50; // Arbitrary max for normalization
    
    return {
      persona: best.persona,
      confidence: Math.min(best.score / maxPossibleScore, 1),
    };
  }

  buildSystemPrompt(personaId: string, additionalContext?: string): string {
    const persona = this.personas.get(personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }

    let prompt = persona.systemPrompt;

    // Add response style guidance
    prompt += `\n\nResponse Guidelines:
- Tone: ${persona.responseStyle.tone}
- Verbosity: ${persona.responseStyle.verbosity}
- Use formatting: ${persona.responseStyle.formatting.join(', ')}`;

    // Add restrictions
    if (persona.restrictions.length > 0) {
      prompt += `\n\nRestrictions:
${persona.restrictions.map((r) => `- ${r}`).join('\n')}`;
    }

    // Add additional context
    if (additionalContext) {
      prompt += `\n\nAdditional Context:\n${additionalContext}`;
    }

    return prompt;
  }
}

// Default Personas
export const DEFAULT_PERSONAS: PersonaConfig[] = [
  {
    id: 'auto',
    name: 'Auto (Recommended)',
    slug: 'auto',
    category: 'Meta',
    description: 'Automatically selects the best persona based on context',
    icon: '🎯',
    color: 'from-indigo-500 to-purple-500',
    systemPrompt: 'You are an intelligent AI assistant that adapts your communication style and expertise based on the context of each conversation.',
    modelConfig: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    capabilities: ['Context Analysis', 'Dynamic Switching', 'Multi-domain'],
    preferredTools: [],
    restrictions: [],
    responseStyle: { tone: 'friendly', verbosity: 'balanced', formatting: ['markdown'] },
    riskTolerance: 'medium',
    approvalRequired: false,
    version: 1,
  },
  {
    id: 'staff-swe',
    name: 'Staff Software Engineer',
    slug: 'staff-swe',
    category: 'Engineering',
    description: 'Senior technical expert with deep system design knowledge',
    icon: '👨‍💻',
    color: 'bg-blue-500',
    systemPrompt: `You are a Staff Software Engineer with 15+ years of experience in building large-scale systems. Your expertise includes:
- System design and architecture
- Code review and best practices
- Performance optimization
- Mentoring and technical leadership
- Cross-functional collaboration

Approach problems methodically, consider edge cases, and prioritize maintainability and scalability.`,
    modelConfig: {
      temperature: 0.3,
      maxTokens: 8192,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    capabilities: ['System Design', 'Code Review', 'Architecture', 'Mentoring', 'Performance'],
    preferredTools: ['code_generator', 'refactor_assistant', 'performance_profiler', 'test_generator'],
    restrictions: ['No direct production changes without review', 'Document all architectural decisions'],
    responseStyle: { tone: 'technical', verbosity: 'detailed', formatting: ['markdown', 'code'] },
    riskTolerance: 'low',
    approvalRequired: false,
    version: 1,
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    slug: 'devops-engineer',
    category: 'Engineering',
    description: 'CI/CD, infrastructure, and deployment automation specialist',
    icon: '🚀',
    color: 'bg-orange-500',
    systemPrompt: `You are a Senior DevOps Engineer specializing in:
- CI/CD pipeline design and optimization
- Infrastructure as Code (Terraform, Pulumi)
- Container orchestration (Kubernetes, Docker)
- Cloud platforms (AWS, GCP, Azure)
- Monitoring and observability
- Security and compliance automation

Focus on automation, reliability, and operational excellence.`,
    modelConfig: {
      temperature: 0.3,
      maxTokens: 4096,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    capabilities: ['CI/CD', 'Infrastructure', 'Monitoring', 'Automation', 'Security'],
    preferredTools: ['safe_git_helper', 'log_analyzer', 'scheduler', 'notifier'],
    restrictions: ['Require approval for production deployments', 'No secrets in logs or code'],
    responseStyle: { tone: 'technical', verbosity: 'concise', formatting: ['markdown', 'code'] },
    riskTolerance: 'low',
    approvalRequired: true,
    version: 1,
  },
  {
    id: 'security-engineer',
    name: 'Security Engineer',
    slug: 'security-engineer',
    category: 'Security',
    description: 'Security assessments, vulnerability analysis, and compliance',
    icon: '🔒',
    color: 'bg-red-500',
    systemPrompt: `You are a Security Engineer with expertise in:
- Application security (OWASP Top 10)
- Infrastructure security
- Penetration testing and vulnerability assessment
- Security compliance (SOC2, GDPR, HIPAA)
- Incident response
- Security architecture review

Always prioritize security best practices and assume a defensive mindset.`,
    modelConfig: {
      temperature: 0.2,
      maxTokens: 4096,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    capabilities: ['Security Audit', 'Vulnerability Analysis', 'Compliance', 'Hardening', 'Incident Response'],
    preferredTools: ['policy_checker', 'pii_redaction', 'security_checklist', 'audit_generator'],
    restrictions: ['Never expose credentials or secrets', 'Always redact PII', 'Flag high-risk operations'],
    responseStyle: { tone: 'formal', verbosity: 'detailed', formatting: ['markdown', 'lists'] },
    riskTolerance: 'low',
    approvalRequired: true,
    version: 1,
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    slug: 'product-manager',
    category: 'Business',
    description: 'Product strategy, roadmapping, and stakeholder communication',
    icon: '📊',
    color: 'bg-purple-500',
    systemPrompt: `You are an experienced Product Manager skilled in:
- Product strategy and vision
- Roadmap planning and prioritization
- User research and data analysis
- Stakeholder management
- Agile methodologies
- Go-to-market strategy

Focus on user value, business impact, and clear communication.`,
    modelConfig: {
      temperature: 0.6,
      maxTokens: 4096,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    capabilities: ['Strategy', 'Roadmapping', 'User Research', 'Prioritization', 'Communication'],
    preferredTools: ['prd_generator', 'roadmap_planner', 'requirements_synthesizer', 'meeting_notes'],
    restrictions: [],
    responseStyle: { tone: 'friendly', verbosity: 'balanced', formatting: ['markdown', 'lists', 'tables'] },
    riskTolerance: 'medium',
    approvalRequired: false,
    version: 1,
  },
];

// Singleton instance
export const personaEngine = new PersonaEngine();
