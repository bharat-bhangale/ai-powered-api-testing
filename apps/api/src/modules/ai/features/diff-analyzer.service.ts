import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  DIFF_ANALYZER_SYSTEM_PROMPT,
  buildDiffAnalyzerPrompt,
  type DiffAnalyzerInput,
} from '../prompts/diff-analyzer.prompt';

// ===== Zod Output Schema =====

const BreakingChangeSchema = z.object({
  endpoint: z.string(),
  change: z.string().describe('Description of what changed'),
  impact: z.string().describe('Client-side impact of this change'),
  migration: z.string().describe('Step-by-step migration instructions'),
});

const DeprecationSchema = z.object({
  endpoint: z.string(),
  signal: z.string().describe('What indicates the deprecation'),
  alternative: z.string().describe('Recommended alternative'),
  deadline: z.string().optional().describe('Removal date if known'),
});

const DriftSchema = z.object({
  endpoint: z.string(),
  change: z.string(),
  risk: z.enum(['high', 'medium', 'low']),
});

const EnhancementSchema = z.object({
  endpoint: z.string(),
  change: z.string(),
});

export const DiffOutputSchema = z.object({
  breakingChanges: z.array(BreakingChangeSchema),
  deprecations: z.array(DeprecationSchema),
  drifts: z.array(DriftSchema),
  enhancements: z.array(EnhancementSchema),
  summary: z.string(),
  migrationGuide: z.string().optional(),
});

export type DiffAnalysis = z.infer<typeof DiffOutputSchema>;

// ===== Service =====

/**
 * DiffAnalyzerService — sends pre-computed structural diffs to AI for categorization.
 * No response bodies are sent — only field names, types, and change descriptors.
 */
export class DiffAnalyzerService {
  async analyze(input: DiffAnalyzerInput): Promise<DiffAnalysis> {
    const result = await llmGateway.completeStructured({
      systemPrompt: DIFF_ANALYZER_SYSTEM_PROMPT,
      userPrompt: buildDiffAnalyzerPrompt(input),
      responseSchema: DiffOutputSchema,
      schemaName: 'diff_analysis',
      temperature: 0.2,
      maxTokens: 5000,
    });

    return result.parsed;
  }
}
