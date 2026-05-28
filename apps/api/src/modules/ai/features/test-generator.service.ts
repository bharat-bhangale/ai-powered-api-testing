import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import { TEST_GEN_SYSTEM_PROMPT, buildTestGenUserPrompt } from '../prompts/test-generation.prompt';

// ===== Zod Schemas for Structured Output =====

const TestSchema = z.object({
  name: z.string().describe('Descriptive test name'),
  category: z.enum(['status', 'body_structure', 'data_validation', 'performance', 'edge_case']),
  assertion: z.string().describe('The test assertion in plain English'),
  script: z.string().describe('JavaScript test script using atx.test() and atx.expect()'),
});

const TestSuiteSchema = z.object({
  tests: z.array(TestSchema).describe('Array of generated test cases'),
  summary: z.string().describe('Brief summary of what was tested'),
});

export type GeneratedTest = z.infer<typeof TestSchema>;
export type GeneratedTestSuite = z.infer<typeof TestSuiteSchema>;

/**
 * Test Generator — sends request+response to the LLM and gets back
 * a structured test suite with categorized assertions and scripts.
 */
export class TestGeneratorService {
  async generateTests(
    request: { method: string; url: string },
    response: { status: number; statusText: string; headers: Record<string, string>; body: unknown; timing: { total: number } },
  ): Promise<GeneratedTestSuite> {
    const result = await llmGateway.completeStructured({
      systemPrompt: TEST_GEN_SYSTEM_PROMPT,
      userPrompt: buildTestGenUserPrompt(request, response),
      responseSchema: TestSuiteSchema,
      schemaName: 'test_suite',
      temperature: 0.2,
    });

    return result.parsed;
  }
}
