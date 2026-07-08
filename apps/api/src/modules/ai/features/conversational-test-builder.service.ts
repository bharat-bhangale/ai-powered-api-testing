import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  CONV_TEST_BUILDER_SYSTEM_PROMPT,
  buildConvTestBuilderUserPrompt,
  type ConvTestBuilderInput,
} from '../prompts/conversational-test-builder.prompt';

// ===== Zod Schemas =====

const GeneratedTestSchema = z.object({
  name: z.string().describe('Descriptive name for the test'),
  category: z
    .enum(['status', 'body_structure', 'data_validation', 'performance', 'edge_case', 'auth', 'security'])
    .describe('Test category'),
  script: z.string().describe('Complete atx.test() script ready to run'),
});

const ConvTestBuilderResponseSchema = z.object({
  reply: z
    .string()
    .describe('Conversational response in markdown — concise, friendly, QA-engineer tone'),
  generatedTests: z
    .array(GeneratedTestSchema)
    .describe('ALL generated tests so far — never omit previously generated tests'),
  questions: z
    .array(z.string())
    .describe('0-2 targeted follow-up questions to improve test quality'),
  isComplete: z
    .boolean()
    .describe('True when the test suite is comprehensive and ready to run'),
});

export type ConvTestBuilderResponse = z.infer<typeof ConvTestBuilderResponseSchema>;
export type GeneratedConvTest = z.infer<typeof GeneratedTestSchema>;

// ===== Service =====

/**
 * ConversationalTestBuilderService — drives a multi-turn conversation
 * with the LLM to collaboratively build comprehensive test suites.
 *
 * Each call passes the full conversation history so the model has
 * complete context for what tests have already been agreed upon.
 */
export class ConversationalTestBuilderService {
  async sendMessage(input: ConvTestBuilderInput): Promise<ConvTestBuilderResponse> {
    const result = await llmGateway.completeStructured({
      systemPrompt: CONV_TEST_BUILDER_SYSTEM_PROMPT,
      userPrompt: buildConvTestBuilderUserPrompt(input),
      responseSchema: ConvTestBuilderResponseSchema,
      schemaName: 'conv_test_builder_response',
      temperature: 0.4,
      maxTokens: 4000,
    });

    return result.parsed;
  }

  /**
   * Composite all generated tests into a single runnable script.
   * Deduplicates by test name (keeps last version to allow updates).
   */
  static buildCompositeScript(tests: GeneratedConvTest[]): string {
    // Deduplicate by name — keep the last occurrence to support "update test X"
    const deduped = new Map<string, GeneratedConvTest>();
    for (const test of tests) {
      deduped.set(test.name, test);
    }

    return Array.from(deduped.values())
      .map((t) => t.script)
      .join('\n\n');
  }
}
