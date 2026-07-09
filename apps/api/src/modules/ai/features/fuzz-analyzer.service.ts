import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  FUZZ_GENERATION_SYSTEM_PROMPT,
  buildFuzzGenerationPrompt,
  type FieldAnalysis,
  type AiPayloadSuggestion,
} from '../prompts/fuzz-generation.prompt';
import type { FuzzPayload } from '../../fuzz-testing/payload-generators';

// ===== Zod Schema =====

const AiPayloadSchema = z.object({
  suggestions: z.array(z.object({
    fieldName: z.string(),
    payloads: z.array(z.object({
      label: z.string(),
      value: z.unknown(),
    })).max(8),
  })).max(10),
});

/**
 * FuzzAnalyzerService — uses AI to generate contextually aware fuzz payloads
 * based on field names and their current values.
 *
 * Supplements the static payload library with semantics-aware attacks.
 */
export class FuzzAnalyzerService {
  async generatePayloads(fields: FieldAnalysis[]): Promise<FuzzPayload[]> {
    if (fields.length === 0) return [];

    try {
      const result = await llmGateway.completeStructured({
        systemPrompt: FUZZ_GENERATION_SYSTEM_PROMPT,
        userPrompt: buildFuzzGenerationPrompt(fields.slice(0, 10)),
        responseSchema: AiPayloadSchema,
        schemaName: 'fuzz_generation',
        temperature: 0.4,  // Slightly creative for novel payloads
        maxTokens: 2000,
      });

      const payloads: FuzzPayload[] = [];
      for (const suggestion of result.parsed.suggestions) {
        for (const p of suggestion.payloads) {
          payloads.push({
            category: 'injection',  // AI payloads default to injection category
            label: `[AI:${suggestion.fieldName}] ${p.label}`,
            value: p.value,
          });
        }
      }
      return payloads;
    } catch {
      // AI failure is non-fatal — fuzz test continues with static payloads
      return [];
    }
  }
}
