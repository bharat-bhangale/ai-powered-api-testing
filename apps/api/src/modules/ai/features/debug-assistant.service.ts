import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import { DEBUG_SYSTEM_PROMPT, buildDebugUserPrompt } from '../prompts/debug-analysis.prompt';

// ===== Zod Schema for Structured Output =====

const DebugAnalysisSchema = z.object({
  diagnosis: z.object({
    cause: z.string().describe('Most likely cause of the error'),
    confidence: z.enum(['high', 'medium', 'low']),
    explanation: z.string().describe('Detailed explanation of what went wrong'),
  }),
  suggestions: z.array(z.object({
    title: z.string(),
    description: z.string(),
    code: z.string().optional().describe('Code fix if applicable'),
    priority: z.enum(['critical', 'recommended', 'optional']),
  })),
  relatedDocs: z.array(z.string()).optional().describe('Relevant documentation links'),
});

export type DebugAnalysis = z.infer<typeof DebugAnalysisSchema>;

/**
 * Debug Assistant — analyzes error responses (4xx/5xx) and provides
 * structured diagnosis, fix suggestions, and code examples.
 */
export class DebugAssistantService {
  async analyze(
    request: { method: string; url: string; headers: Record<string, string>; body: unknown },
    response: { status: number; statusText: string; headers: Record<string, string>; body: unknown },
  ): Promise<DebugAnalysis> {
    const result = await llmGateway.completeStructured({
      systemPrompt: DEBUG_SYSTEM_PROMPT,
      userPrompt: buildDebugUserPrompt(request, response),
      responseSchema: DebugAnalysisSchema,
      schemaName: 'debug_analysis',
      temperature: 0.3,
    });

    return result.parsed;
  }
}
