import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  DATA_GEN_SYSTEM_PROMPT,
  buildDataGenPrompt,
  type DataGenInput,
  type DataGenOutput,
} from '../prompts/data-generation.prompt';

// ===== Zod Schema =====

const DataVariationSchema = z.object({
  name: z.string(),
  body: z.record(z.unknown()),
  description: z.string(),
});

const DataGenOutputSchema = z.object({
  generatedBody: z.record(z.unknown()),
  explanation: z.string(),
  variations: z.array(DataVariationSchema).min(1).max(3),
});

// ===== Service =====

/**
 * DataGeneratorService — uses AI to generate contextually realistic test data.
 *
 * Caches the last 3 generations per (url+preset) key for instant preset switching.
 * Low temperature (0.7) balances realism with variety across presets.
 */
export class DataGeneratorService {
  private cache = new Map<string, DataGenOutput>();

  async generate(input: DataGenInput): Promise<DataGenOutput> {
    const cacheKey = `${input.method}:${input.url}:${input.preset}`;

    // Return cached if available
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await llmGateway.completeStructured({
      systemPrompt: DATA_GEN_SYSTEM_PROMPT,
      userPrompt: buildDataGenPrompt(input),
      responseSchema: DataGenOutputSchema,
      schemaName: 'data_generation',
      temperature: 0.7,   // Higher temp for diverse, realistic data
      maxTokens: 2000,
    });

    const output: DataGenOutput = result.parsed as DataGenOutput;

    // Cache (LRU-style: keep last 9 entries)
    if (this.cache.size >= 9) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, output);

    return output;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
