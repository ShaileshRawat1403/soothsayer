import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface PersonaConfig {
  mission: string;
  communicationStyle: string;
  verbosityLevel: string;
  decisionStyle: string;
  riskTolerance: string;
  outputFormat: string;
  expertiseTags: string[];
  toolPreferences: Array<{ toolId: string; priority: string }>;
  constraints: string[];
  approvalDefaults: {
    requireApprovalForTier: number;
    autoApproveCategories: string[];
    alwaysApproveCategories: string[];
  };
  systemPromptTemplate: string;
}

interface CreatePersonaDto {
  name: string;
  category: string;
  description: string;
  avatarUrl?: string;
  workspaceId?: string;
  config: PersonaConfig;
}

interface UpdatePersonaDto {
  name?: string;
  description?: string;
  avatarUrl?: string;
  config?: Partial<PersonaConfig>;
  changelog?: string;
}

@Injectable()
export class PersonasService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: {
    workspaceId?: string;
    category?: string;
    includeBuiltIn?: boolean;
    includeCustom?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      workspaceId,
      category,
      includeBuiltIn = true,
      includeCustom = true,
      search,
      page = 1,
      limit = 20,
    } = options;

    const where: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
    };

    // Build filter conditions
    const orConditions: Record<string, unknown>[] = [];
    if (includeBuiltIn) {
      orConditions.push({ isBuiltIn: true });
    }
    if (includeCustom && workspaceId) {
      orConditions.push({ workspaceId });
    }
    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [personas, total] = await Promise.all([
      this.prisma.persona.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          description: true,
          avatarUrl: true,
          isBuiltIn: true,
          version: true,
          totalUsages: true,
          successRate: true,
          avgRating: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isBuiltIn: 'desc' }, { totalUsages: 'desc' }],
      }),
      this.prisma.persona.count({ where }),
    ]);

    return {
      personas,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id },
      include: {
        versions: {
          select: {
            id: true,
            version: true,
            changelog: true,
            createdAt: true,
          },
          orderBy: { version: 'desc' },
          take: 10,
        },
      },
    });

    if (!persona || persona.deletedAt) {
      throw new NotFoundException('Persona not found');
    }

    return persona;
  }

  async create(userId: string, dto: CreatePersonaDto) {
    const slug = this.generateSlug(dto.name);

    // Check if slug already exists
    const existing = await this.prisma.persona.findFirst({
      where: {
        slug,
        OR: [
          { workspaceId: dto.workspaceId || null },
          { isBuiltIn: true },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('A persona with this name already exists');
    }

    const persona = await this.prisma.persona.create({
      data: {
        name: dto.name,
        slug,
        category: dto.category,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        workspaceId: dto.workspaceId,
        createdById: userId,
        isBuiltIn: false,
        config: dto.config as any,
      },
    });

    // Create initial version
    await this.prisma.personaVersion.create({
      data: {
        personaId: persona.id,
        version: 1,
        config: dto.config as any,
        changelog: 'Initial version',
        createdById: userId,
      },
    });

    return persona;
  }

  async update(id: string, userId: string, dto: UpdatePersonaDto) {
    const persona = await this.findOne(id);

    // Check if user can edit
    if (persona.isBuiltIn) {
      throw new ForbiddenException('Cannot modify built-in personas');
    }

    // Merge config
    const currentConfig = persona.config as unknown as PersonaConfig;
    const newConfig = dto.config
      ? { ...currentConfig, ...dto.config }
      : currentConfig;

    const newVersion = persona.version + 1;

    // Update persona
    const updated = await this.prisma.persona.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
        config: newConfig as any,
        version: newVersion,
      },
    });

    // Create new version
    await this.prisma.personaVersion.create({
      data: {
        personaId: id,
        version: newVersion,
        config: newConfig as any,
        changelog: dto.changelog,
        createdById: userId,
      },
    });

    return { persona: updated, newVersion };
  }

  async delete(id: string, userId: string) {
    const persona = await this.findOne(id);

    if (persona.isBuiltIn) {
      throw new ForbiddenException('Cannot delete built-in personas');
    }

    await this.prisma.persona.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async clone(sourceId: string, userId: string, name: string, workspaceId?: string) {
    const source = await this.findOne(sourceId);
    const slug = this.generateSlug(name);

    const persona = await this.prisma.persona.create({
      data: {
        name,
        slug,
        category: source.category,
        description: `Clone of ${source.name}: ${source.description}`,
        avatarUrl: source.avatarUrl,
        workspaceId,
        createdById: userId,
        isBuiltIn: false,
        config: source.config as any,
      },
    });

    // Create initial version
    await this.prisma.personaVersion.create({
      data: {
        personaId: persona.id,
        version: 1,
        config: source.config as any,
        changelog: `Cloned from ${source.name}`,
        createdById: userId,
      },
    });

    return persona;
  }

  async exportPersona(id: string) {
    const persona = await this.findOne(id);

    return {
      version: '1.0',
      exportedAt: new Date(),
      persona: {
        name: persona.name,
        category: persona.category,
        description: persona.description,
        config: persona.config,
      },
    };
  }

  async importPersona(
    userId: string,
    data: {
      name: string;
      category: string;
      description: string;
      config: PersonaConfig;
    },
    workspaceId?: string,
    overrideName?: string,
  ) {
    return this.create(userId, {
      name: overrideName || data.name,
      category: data.category,
      description: data.description,
      workspaceId,
      config: data.config,
    });
  }

  async rollback(id: string, userId: string, targetVersion: number) {
    const persona = await this.findOne(id);

    if (persona.isBuiltIn) {
      throw new ForbiddenException('Cannot modify built-in personas');
    }

    const version = await this.prisma.personaVersion.findFirst({
      where: { personaId: id, version: targetVersion },
    });

    if (!version) {
      throw new NotFoundException(`Version ${targetVersion} not found`);
    }

    const newVersion = persona.version + 1;

    // Update persona with old config
    const updated = await this.prisma.persona.update({
      where: { id },
      data: {
        config: version.config as any,
        version: newVersion,
      },
    });

    // Create version record for rollback
    await this.prisma.personaVersion.create({
      data: {
        personaId: id,
        version: newVersion,
        config: version.config as any,
        changelog: `Rolled back to version ${targetVersion}`,
        createdById: userId,
      },
    });

    return {
      persona: updated,
      rolledBackFrom: persona.version,
      rolledBackTo: targetVersion,
    };
  }

  async setPreference(
    userId: string,
    personaId: string,
    workspaceId?: string,
    isDefault = false,
  ) {
    // If setting as default, clear other defaults
    if (isDefault) {
      await this.prisma.personaPreference.updateMany({
        where: {
          userId,
          workspaceId: workspaceId || null,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.personaPreference.upsert({
      where: {
        userId_personaId_workspaceId: {
          userId,
          personaId,
          workspaceId: workspaceId || '',
        },
      },
      create: {
        userId,
        personaId,
        workspaceId,
        isDefault,
      },
      update: { isDefault },
    });
  }

  async getAutoPersonaRecommendation(input: string, workspaceId?: string) {
    // Simple keyword-based classification
    const inputLower = input.toLowerCase();

    // Define intent patterns
    const patterns: Array<{ keywords: string[]; category: string; intents: string[] }> = [
      {
        keywords: ['code', 'function', 'class', 'implement', 'debug', 'fix bug', 'refactor'],
        category: 'developer',
        intents: ['coding', 'debugging'],
      },
      {
        keywords: ['api', 'endpoint', 'rest', 'graphql', 'backend'],
        category: 'developer',
        intents: ['api-design', 'backend'],
      },
      {
        keywords: ['ui', 'component', 'css', 'react', 'frontend', 'design'],
        category: 'developer',
        intents: ['frontend', 'ui-design'],
      },
      {
        keywords: ['deploy', 'docker', 'kubernetes', 'ci/cd', 'infrastructure'],
        category: 'developer',
        intents: ['devops', 'deployment'],
      },
      {
        keywords: ['test', 'testing', 'unit test', 'integration', 'qa'],
        category: 'developer',
        intents: ['testing', 'quality'],
      },
      {
        keywords: ['security', 'vulnerability', 'audit', 'penetration'],
        category: 'developer',
        intents: ['security', 'audit'],
      },
      {
        keywords: ['product', 'feature', 'roadmap', 'prd', 'requirement'],
        category: 'business',
        intents: ['product-management', 'planning'],
      },
      {
        keywords: ['project', 'timeline', 'milestone', 'task', 'planning'],
        category: 'business',
        intents: ['project-management', 'planning'],
      },
      {
        keywords: ['data', 'analytics', 'metrics', 'kpi', 'report'],
        category: 'business',
        intents: ['analytics', 'reporting'],
      },
      {
        keywords: ['marketing', 'campaign', 'content', 'social'],
        category: 'business',
        intents: ['marketing', 'content'],
      },
      {
        keywords: ['sales', 'customer', 'deal', 'pipeline'],
        category: 'business',
        intents: ['sales', 'crm'],
      },
      {
        keywords: ['incident', 'outage', 'emergency', 'on-call'],
        category: 'specialist',
        intents: ['incident-response', 'emergency'],
      },
      {
        keywords: ['document', 'documentation', 'tutorial', 'guide'],
        category: 'specialist',
        intents: ['documentation', 'writing'],
      },
    ];

    // Find matching patterns
    const matches = patterns.filter((p) =>
      p.keywords.some((k) => inputLower.includes(k)),
    );

    // Get matching category or default
    const matchedCategory = matches.length > 0 ? matches[0].category : 'developer';
    const matchedIntents = matches.flatMap((m) => m.intents);

    // Get personas for the category
    const personas = await this.prisma.persona.findMany({
      where: {
        category: matchedCategory,
        isActive: true,
        deletedAt: null,
        OR: [{ isBuiltIn: true }, { workspaceId }],
      },
      orderBy: { totalUsages: 'desc' },
      take: 5,
    });

    // Calculate confidence and create recommendations
    const recommendations = personas.map((p: any, index: number) => ({
      personaId: p.id,
      persona: p,
      confidence: Math.max(0.9 - index * 0.15, 0.3),
      reasoning: `Matched category: ${matchedCategory}`,
      matchedIntents,
    }));

    // Determine complexity and risk
    const complexity = inputLower.includes('complex') || inputLower.includes('difficult')
      ? 'complex'
      : inputLower.includes('simple') || inputLower.includes('quick')
        ? 'simple'
        : 'moderate';

    const riskLevel = inputLower.includes('production') || inputLower.includes('critical')
      ? 'high'
      : inputLower.includes('test') || inputLower.includes('development')
        ? 'low'
        : 'medium';

    return {
      recommendations,
      selectedPersonaId: recommendations[0]?.personaId,
      taskClassification: {
        domain: matchedCategory,
        intents: matchedIntents,
        complexity,
        riskLevel,
        suggestedTier: riskLevel === 'high' ? 2 : 1,
      },
    };
  }

  async recordUsage(personaId: string, success: boolean, completionTimeMs: number) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) return;

    const newTotalUsages = persona.totalUsages + 1;
    const successCount = persona.successRate * persona.totalUsages;
    const newSuccessRate = (successCount + (success ? 1 : 0)) / newTotalUsages;
    
    const totalTime = persona.avgCompletionTime * persona.totalUsages;
    const newAvgTime = (totalTime + completionTimeMs) / newTotalUsages;

    await this.prisma.persona.update({
      where: { id: personaId },
      data: {
        totalUsages: newTotalUsages,
        successRate: newSuccessRate,
        avgCompletionTime: newAvgTime,
        lastUsedAt: new Date(),
      },
    });
  }

  async ratePersona(personaId: string, rating: number) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) return;

    const totalRating = persona.avgRating * persona.ratingCount;
    const newRatingCount = persona.ratingCount + 1;
    const newAvgRating = (totalRating + rating) / newRatingCount;

    await this.prisma.persona.update({
      where: { id: personaId },
      data: {
        avgRating: newAvgRating,
        ratingCount: newRatingCount,
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
