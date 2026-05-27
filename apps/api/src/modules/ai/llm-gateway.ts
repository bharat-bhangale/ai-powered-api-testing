import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

// ===== Types =====

export interface CompletionParams {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  content: string;
  parsed?: unknown;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

// ===== LLM Gateway =====

/**
 * Provider-agnostic LLM gateway. Wraps OpenAI client with three modes:
 * - complete():           Standard text completion
 * - completeStructured(): Structured output enforced by Zod schema
 * - stream():            Streaming completion yielding token chunks
 *
 * Feature services call gateway methods — only the constructor knows about OpenAI.
 */
export class LLMGateway {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /** Standard text completion */
  async complete(params: CompletionParams): Promise<CompletionResult> {
    const response = await this.openai.chat.completions.create({
      model: params.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens || 4000,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
    };
  }

  /** Structured output — returns parsed JSON matching the Zod schema */
  async completeStructured<T>(
    params: CompletionParams & { responseSchema: z.ZodType<T>; schemaName: string },
  ): Promise<CompletionResult & { parsed: T }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = params.responseSchema as z.ZodType<any, any, any>;
    const response = await this.openai.chat.completions.parse({
      model: params.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens || 4000,
      // @ts-expect-error — zodResponseFormat creates excessively deep type instantiation with Zod v3 + OpenAI v6
      response_format: zodResponseFormat(schema, params.schemaName),
    });

    const parsed = response.choices[0]?.message?.parsed as T | undefined;
    if (!parsed) {
      throw new Error('AI response could not be parsed into the expected format');
    }

    return {
      content: JSON.stringify(parsed),
      parsed,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
    };
  }

  /** Streaming completion — yields content chunks as they arrive */
  async *stream(params: CompletionParams): AsyncIterable<string> {
    const stream = await this.openai.chat.completions.create({
      model: params.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.5,
      max_tokens: params.maxTokens || 4000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}

/** Singleton gateway instance — reused across all AI features */
export const llmGateway = new LLMGateway();
