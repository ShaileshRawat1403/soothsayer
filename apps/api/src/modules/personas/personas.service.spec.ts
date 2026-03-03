import { ConfigService } from '@nestjs/config';
import { PersonasService } from './personas.service';

describe('PersonasService recommender', () => {
  const makeService = (overrides: Record<string, unknown> = {}) => {
    const personaFindMany = jest.fn();
    const prisma = {
      persona: {
        findMany: personaFindMany,
      },
    } as any;

    const values: Record<string, unknown> = {
      PERSONA_RECOMMENDER_MODE: 'hybrid',
      PERSONA_RECOMMENDATION_TOP_K: 5,
      PERSONA_SEMANTIC_MIN_SCORE: 0.2,
      PERSONA_EMBEDDING_MODEL: 'text-embedding-3-small',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_API_KEY: 'test-key',
      ...overrides,
    };

    const config = {
      get: jest.fn((key: string, fallback?: unknown) =>
        Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback,
      ),
    } as unknown as ConfigService;

    return { service: new PersonasService(prisma, config), personaFindMany };
  };

  it('uses semantic ranking when embeddings are available', async () => {
    const { service, personaFindMany } = makeService();

    personaFindMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Staff Engineer',
        slug: 'staff-engineer',
        category: 'developer',
        description: 'Engineering architecture and coding',
        config: {},
        totalUsages: 100,
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
      {
        id: 'p2',
        name: 'Product Strategist',
        slug: 'product-strategist',
        category: 'business',
        description: 'Roadmaps and stakeholder alignment',
        config: {},
        totalUsages: 20,
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
    ]);

    jest
      .spyOn(service as any, 'fetchEmbedding')
      .mockResolvedValueOnce([1, 0]) // query
      .mockResolvedValueOnce([1, 0]) // p1
      .mockResolvedValueOnce([0, 1]); // p2

    const result = await service.getAutoPersonaRecommendation(
      'Help me design an API architecture',
      'ws1',
    );

    expect(result.selectedPersonaId).toBe('p1');
    expect(result.recommender?.mode).toBe('semantic');
    expect(result.recommendations[0].personaId).toBe('p1');
    expect(personaFindMany).toHaveBeenCalledTimes(1);
  });

  it('falls back to keyword mode when semantic embeddings are unavailable', async () => {
    const { service, personaFindMany } = makeService({
      OPENAI_API_KEY: '',
    });

    personaFindMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Dev Persona',
        slug: 'dev-persona',
        category: 'developer',
        description: 'Coding persona',
        config: {},
        totalUsages: 10,
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
      {
        id: 'p2',
        name: 'Biz Persona',
        slug: 'biz-persona',
        category: 'business',
        description: 'Business persona',
        config: {},
        totalUsages: 5,
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.getAutoPersonaRecommendation('debug this code and refactor', 'ws1');

    expect(result.recommender?.mode).toBe('keyword');
    expect(result.recommender?.fallbackUsed).toBe(true);
    expect(result.selectedPersonaId).toBe('p1');
  });
});
