import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import { COVERAGE_SYSTEM_PROMPT, buildCoverageUserPrompt } from '../prompts/coverage-analysis.prompt';
import { SavedRequest, type ISavedRequest } from '../../../models/Request.model';
import { Collection } from '../../../models/Collection.model';
import { History } from '../../../models/History.model';

// ===== Zod Schema for Structured Output =====

const MissingTestSchema = z.object({
  endpoint: z.string().describe('e.g. "POST /api/users"'),
  gap: z.string().describe('What test is missing'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
});

const SecurityGapSchema = z.object({
  endpoint: z.string().describe('e.g. "DELETE /api/users/:id"'),
  issue: z.string().describe('Security concern'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
});

const CoverageOutputSchema = z.object({
  coverage: z.object({
    score: z.number().describe('Coverage score 0-100'),
    testedEndpoints: z.number().describe('Number of endpoints with test scripts'),
    totalEndpoints: z.number().describe('Total number of endpoints'),
    untestedEndpoints: z.array(z.string()).describe('List of untested endpoint names like "DELETE /api/users/:id"'),
  }),
  missingTests: z.array(MissingTestSchema).describe('Specific missing test scenarios'),
  securityGaps: z.array(SecurityGapSchema).describe('Security testing gaps'),
  suggestions: z.array(z.string()).describe('General improvement suggestions'),
});

export type CoverageAnalysis = z.infer<typeof CoverageOutputSchema>;

// ===== Constants =====

const MAX_BODY_PREVIEW = 500;
const MAX_SCRIPT_PREVIEW = 300;

// ===== Service =====

/**
 * Coverage Analyzer Service — AI reviews a collection and identifies
 * untested endpoints, missing test scenarios, security gaps,
 * and improvement suggestions.
 */
export class CoverageAnalyzerService {
  /**
   * Analyze test coverage for a collection.
   */
  async analyze(userId: string, collectionId: string): Promise<CoverageAnalysis> {
    // 1. Load collection
    const collection = await Collection.findOne({ _id: collectionId, userId });
    if (!collection) {
      throw new Error('Collection not found');
    }

    // 2. Load all requests
    const requests = await SavedRequest.find({ collectionId, userId })
      .sort({ sortOrder: 1 })
      .lean() as unknown as ISavedRequest[];

    if (requests.length === 0) {
      throw new Error('Collection has no requests');
    }

    // 3. Build endpoint context with test script info and history
    const endpoints = await Promise.all(
      requests.map(async (req) => {
        const entry: {
          requestName: string;
          method: string;
          url: string;
          hasTestScript: boolean;
          testScriptPreview?: string;
          responseStatus?: number;
          responseBodyPreview?: string;
        } = {
          requestName: req.name,
          method: req.method,
          url: req.url,
          hasTestScript: Boolean(req.testScript?.trim()),
        };

        // Include test script preview if it exists
        if (req.testScript?.trim()) {
          entry.testScriptPreview = req.testScript.length > MAX_SCRIPT_PREVIEW
            ? req.testScript.substring(0, MAX_SCRIPT_PREVIEW) + '...'
            : req.testScript;
        }

        // Try to get the last history entry for response context
        try {
          const history = await History.findOne({
            userId,
            'request.method': req.method,
          })
            .sort({ executedAt: -1 })
            .lean();

          if (history?.response) {
            entry.responseStatus = history.response.status;
            const bodyStr = typeof history.response.body === 'string'
              ? history.response.body
              : JSON.stringify(history.response.body);
            if (bodyStr.length > MAX_BODY_PREVIEW) {
              entry.responseBodyPreview = bodyStr.substring(0, MAX_BODY_PREVIEW) + '...';
            } else {
              entry.responseBodyPreview = bodyStr;
            }
          }
        } catch {
          // No history — skip
        }

        return entry;
      }),
    );

    // 4. Call LLM for analysis
    const result = await llmGateway.completeStructured({
      systemPrompt: COVERAGE_SYSTEM_PROMPT,
      userPrompt: buildCoverageUserPrompt(collection.name, endpoints),
      responseSchema: CoverageOutputSchema,
      schemaName: 'coverage_analysis',
      temperature: 0.3,
      maxTokens: 4000,
    });

    return result.parsed;
  }
}
