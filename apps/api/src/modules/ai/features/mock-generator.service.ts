import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  MOCK_GENERATION_SYSTEM_PROMPT,
  buildMockGenerationPrompt,
  type MockServerConfig,
  type CollectionEndpoint,
} from '../prompts/mock-generation.prompt';
import { dbProvider } from '../../../data/database-provider';

// ===== Zod Schema =====

const MockRouteSchema = z.object({
  method: z.string(),
  path: z.string(),
  resourceKey: z.string(),
  isCollection: z.boolean(),
  hasId: z.boolean(),
  successStatus: z.number(),
  responseTemplate: z.record(z.unknown()).optional(),
  stateful: z.boolean(),
  paginatable: z.boolean(),
  filterableFields: z.array(z.string()),
});

const MockResourceSchema = z.object({
  key: z.string(),
  fields: z.array(z.string()),
  seedData: z.array(z.unknown()),
});

const MockServerConfigSchema = z.object({
  title: z.string(),
  resources: z.array(MockResourceSchema),
  routes: z.array(MockRouteSchema),
});

// ===== Service =====

/**
 * MockGeneratorService — AI-powered mock server configuration generator.
 * Analyzes a collection and produces a complete MockServerConfig
 * with realistic seed data and route definitions.
 */
export class MockGeneratorService {
  async generate(userId: string, collectionId: string): Promise<MockServerConfig> {
    // 1. Load collection and its requests
    const { collection, requests } = await dbProvider.collections.getById
      ? this.loadViaDbProvider(userId, collectionId)
      : Promise.resolve({ collection: null, requests: [] });

    // Using the public getById on collectionService pattern
    const collData = await this.loadCollection(userId, collectionId);

    // 2. Build endpoint summaries (max 50 per spec)
    const MAX_BODY = 400;
    const endpoints: CollectionEndpoint[] = collData.requests
      .slice(0, 50)
      .map((r) => {
        const ep: CollectionEndpoint = {
          name: r.name,
          method: r.method,
          url: r.url,
        };
        if (r.body?.content?.trim()) {
          ep.bodyContent = r.body.content.substring(0, MAX_BODY);
        }
        return ep;
      });

    if (endpoints.length === 0) {
      throw new Error('Collection has no requests to generate mocks from');
    }

    // 3. Generate mock config via AI
    const result = await llmGateway.completeStructured({
      systemPrompt: MOCK_GENERATION_SYSTEM_PROMPT,
      userPrompt: buildMockGenerationPrompt(collData.collection.name, endpoints),
      responseSchema: MockServerConfigSchema,
      schemaName: 'mock_server_config',
      temperature: 0.3,
      maxTokens: 8000,
    });

    const config = result.parsed;

    // 4. Enforce constraints: max 50 routes, max 100 records per resource
    config.routes = config.routes.slice(0, 50);
    config.resources = config.resources.map((r) => ({
      ...r,
      seedData: r.seedData.slice(0, 100),
    }));

    return config;
  }

  private async loadCollection(userId: string, collectionId: string): Promise<{
    collection: { name: string };
    requests: Array<{ name: string; method: string; url: string; body?: { content?: string } }>;
  }> {
    const collections = await dbProvider.collections.listByUser(userId);
    const coll = collections.find((c) => c.id === collectionId);
    if (!coll) throw new Error('Collection not found');

    const requests = await dbProvider.requests.listByCollection({ collectionId, userId });
    return {
      collection: coll,
      requests: requests as Array<{ name: string; method: string; url: string; body?: { content?: string } }>,
    };
  }

  // Fallback — not used but satisfies the generic overload reference
  private loadViaDbProvider(_userId: string, _collectionId: string): Promise<{ collection: null; requests: [] }> {
    return Promise.resolve({ collection: null, requests: [] });
  }
}
