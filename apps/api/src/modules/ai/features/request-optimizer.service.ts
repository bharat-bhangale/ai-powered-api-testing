import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  REQUEST_OPTIMIZER_SYSTEM_PROMPT,
  buildOptimizerPrompt,
  type OptimizerInput,
} from '../prompts/request-optimizer.prompt';

// ===== Zod Schema =====

const FixSchema = z.object({
  type: z.enum(['add_header', 'change_method', 'add_param', 'modify_body']),
  key: z.string().optional(),
  value: z.string().optional(),
});

const OptimizationSchema = z.object({
  category: z.enum(['headers', 'performance', 'security', 'best_practices', 'correctness']),
  title: z.string(),
  description: z.string(),
  currentValue: z.string().optional(),
  suggestedValue: z.string().optional(),
  severity: z.enum(['info', 'warning', 'critical']),
  autoFixable: z.boolean(),
  fix: FixSchema.optional(),
});

const OptimizerOutputSchema = z.object({
  optimizations: z.array(OptimizationSchema).max(10),
  score: z.number().min(0).max(100),
});

export type OptimizationResult = z.infer<typeof OptimizerOutputSchema>;
export type Optimization = z.infer<typeof OptimizationSchema>;

// ===== Constants =====

const MAX_BODY_PREVIEW = 2000;

// ===== Service =====

/**
 * RequestOptimizerService — analyzes a request+response pair and returns
 * scored optimization suggestions grouped by category.
 *
 * Response body is truncated to MAX_BODY_PREVIEW chars before being sent to AI.
 * Never sends authentication credentials — only structure.
 */
export class RequestOptimizerService {
  async optimize(
    request: {
      method: string;
      url: string;
      headers: Array<{ key: string; value: string; enabled: boolean }>;
      params: Array<{ key: string; value: string; enabled: boolean }>;
      body: { mode: string; content: string };
    },
    response: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: unknown;
      size: number;
      timing: number;
    },
  ): Promise<OptimizationResult> {
    // Truncate body to keep prompt under token limit
    const bodyStr = response.body != null
      ? (typeof response.body === 'string' ? response.body : JSON.stringify(response.body))
      : '';

    const input: OptimizerInput = {
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        params: request.params,
        body: { mode: request.body.mode, content: request.body.content.substring(0, 500) },
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        bodyPreview: bodyStr.substring(0, MAX_BODY_PREVIEW),
        size: response.size,
        timing: response.timing,
      },
    };

    const result = await llmGateway.completeStructured({
      systemPrompt: REQUEST_OPTIMIZER_SYSTEM_PROMPT,
      userPrompt: buildOptimizerPrompt(input),
      responseSchema: OptimizerOutputSchema,
      schemaName: 'request_optimization',
      temperature: 0.2,
      maxTokens: 3000,
    });

    return result.parsed;
  }
}
