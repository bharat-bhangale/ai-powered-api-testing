import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import { SUITE_GEN_SYSTEM_PROMPT, buildSuiteGenUserPrompt } from '../prompts/suite-generation.prompt';
import { SavedRequest, type ISavedRequest } from '../../../models/Request.model';
import { Collection } from '../../../models/Collection.model';
import { History } from '../../../models/History.model';

// ===== Zod Schemas for Structured Output =====

const SuiteTestSchema = z.object({
  name: z.string().describe('Descriptive test name'),
  category: z.enum(['status', 'body_structure', 'data_validation', 'performance', 'edge_case', 'chain']),
  assertion: z.string().describe('The test assertion in plain English'),
  script: z.string().describe('JavaScript test script using atx.test() and atx.expect()'),
});

const EndpointTestsSchema = z.object({
  requestId: z.string().describe('The ID of the request this test belongs to'),
  requestName: z.string().describe('Name of the request'),
  tests: z.array(SuiteTestSchema).describe('Tests for this endpoint'),
});

const ChainStepSchema = z.object({
  requestName: z.string().describe('Name of the request in this chain step'),
  testScript: z.string().describe('Test script for this chain step'),
});

const ChainTestSchema = z.object({
  name: z.string().describe('Name of the chain test flow'),
  description: z.string().describe('What this chain test validates'),
  steps: z.array(ChainStepSchema).describe('Ordered steps in the chain test'),
});

const CoverageSchema = z.object({
  score: z.number().describe('Coverage score from 0 to 100'),
  gaps: z.array(z.string()).describe('Untested scenarios or gaps'),
});

const SuiteOutputSchema = z.object({
  suiteTests: z.array(EndpointTestsSchema).describe('Tests grouped by endpoint'),
  chainTests: z.array(ChainTestSchema).describe('Cross-endpoint chain tests'),
  coverage: CoverageSchema.describe('Coverage analysis'),
});

export type SuiteOutput = z.infer<typeof SuiteOutputSchema>;

// ===== Constants =====

const MAX_RESPONSE_BODY_LENGTH = 1000;
const BATCH_SIZE = 10;
const MAX_TOKENS = 8000;

// ===== Service =====

/**
 * Suite Generator — sends the entire collection context to the LLM
 * and receives a structured test suite with per-endpoint tests,
 * cross-endpoint chain tests, and coverage analysis.
 */
export class SuiteGeneratorService {
  /**
   * Generate a comprehensive test suite for a collection.
   */
  async generateSuite(
    userId: string,
    collectionId: string,
  ): Promise<SuiteOutput> {
    // 1. Load collection
    const collection = await Collection.findOne({ _id: collectionId, userId });
    if (!collection) {
      throw new Error('Collection not found');
    }

    // 2. Load all requests in order
    const requests = await SavedRequest.find({ collectionId, userId })
      .sort({ sortOrder: 1 })
      .lean() as unknown as ISavedRequest[];

    if (requests.length === 0) {
      throw new Error('Collection has no requests');
    }

    // 3. For each request, try to find the most recent history entry for context
    const endpoints = await Promise.all(
      requests.map(async (req) => {
        const entry: {
          requestId: string;
          requestName: string;
          method: string;
          url: string;
          body?: { mode: string; content: string };
          responseStatus?: number;
          responseBody?: string;
        } = {
          requestId: String(req._id),
          requestName: req.name,
          method: req.method,
          url: req.url,
          body: req.body,
        };

        // Try to get the last history entry for this request
        try {
          const history = await History.findOne({
            userId,
            'request.method': req.method,
            'request.url': { $regex: escapeRegex(extractPath(req.url)), $options: 'i' },
          })
            .sort({ executedAt: -1 })
            .lean();

          if (history && history.response) {
            entry.responseStatus = history.response.status;
            const bodyStr = typeof history.response.body === 'string'
              ? history.response.body
              : JSON.stringify(history.response.body);
            entry.responseBody = bodyStr.length > MAX_RESPONSE_BODY_LENGTH
              ? bodyStr.substring(0, MAX_RESPONSE_BODY_LENGTH) + '... (truncated)'
              : bodyStr;
          }
        } catch {
          // No history — skip response context
        }

        return entry;
      }),
    );

    // 4. If > BATCH_SIZE requests, process in batches and merge
    if (endpoints.length > BATCH_SIZE * 2) {
      return this.generateInBatches(collection.name, endpoints);
    }

    // 5. Single call for small-medium collections
    return this.callLLM(collection.name, endpoints);
  }

  /**
   * Process large collections in batches of BATCH_SIZE, then merge results.
   */
  private async generateInBatches(
    collectionName: string,
    endpoints: Array<{
      requestId: string;
      requestName: string;
      method: string;
      url: string;
      body?: { mode: string; content: string };
      responseStatus?: number;
      responseBody?: string;
    }>,
  ): Promise<SuiteOutput> {
    const batches: typeof endpoints[] = [];
    for (let i = 0; i < endpoints.length; i += BATCH_SIZE) {
      batches.push(endpoints.slice(i, i + BATCH_SIZE));
    }

    const results: SuiteOutput[] = [];
    for (const batch of batches) {
      const result = await this.callLLM(collectionName, batch);
      results.push(result);
    }

    // Merge all batch results
    const merged: SuiteOutput = {
      suiteTests: results.flatMap((r) => r.suiteTests),
      chainTests: results.flatMap((r) => r.chainTests),
      coverage: {
        score: Math.round(
          results.reduce((sum, r) => sum + r.coverage.score, 0) / results.length,
        ),
        gaps: results.flatMap((r) => r.coverage.gaps),
      },
    };

    return merged;
  }

  /**
   * Single LLM call for a batch of endpoints.
   */
  private async callLLM(
    collectionName: string,
    endpoints: Array<{
      requestId: string;
      requestName: string;
      method: string;
      url: string;
      body?: { mode: string; content: string };
      responseStatus?: number;
      responseBody?: string;
    }>,
  ): Promise<SuiteOutput> {
    const result = await llmGateway.completeStructured({
      systemPrompt: SUITE_GEN_SYSTEM_PROMPT,
      userPrompt: buildSuiteGenUserPrompt(collectionName, endpoints),
      responseSchema: SuiteOutputSchema,
      schemaName: 'suite_output',
      temperature: 0.2,
      maxTokens: MAX_TOKENS,
    });

    return result.parsed;
  }
}

// ===== Helpers =====

/** Extract the path from a URL (strip protocol + domain for matching) */
function extractPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    // If URL is relative or can't be parsed, return as-is
    return url.replace(/^https?:\/\/[^/]+/, '');
  }
}

/** Escape special regex characters */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
