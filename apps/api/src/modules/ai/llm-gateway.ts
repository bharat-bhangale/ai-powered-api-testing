import { z } from 'zod';
import {
  GoogleGenAI,
  Type,
  type GenerateContentConfig,
  type GenerateContentResponse,
  type Schema,
} from '@google/genai';
import { env } from '../../config/env';

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
 * Provider-agnostic LLM gateway. Wraps Gemini with three modes:
 * - complete():           Standard text completion
 * - completeStructured(): Structured output requested from Gemini and validated with Zod
 * - stream():            Streaming completion yielding token chunks
 *
 * Feature services call gateway methods — only this class knows about Gemini.
 */
export class LLMGateway {
  private gemini: GoogleGenAI | null = null;

  private getGeminiClient(): GoogleGenAI {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required to use AI features');
    }

    this.gemini ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    return this.gemini;
  }

  private getModel(model?: string): string {
    return model || env.GEMINI_MODEL;
  }

  /** Standard text completion */
  async complete(params: CompletionParams): Promise<CompletionResult> {
    const model = this.getModel(params.model);
    const response = await this.getGeminiClient().models.generateContent({
      model,
      contents: params.userPrompt,
      config: buildGenerationConfig(params, 0.3),
    });

    return {
      content: response.text || '',
      usage: mapGeminiUsage(response),
      model: response.modelVersion || model,
    };
  }

  /** Structured output — returns parsed JSON matching the Zod schema */
  async completeStructured<T>(
    params: CompletionParams & { responseSchema: z.ZodType<T>; schemaName: string },
  ): Promise<CompletionResult & { parsed: T }> {
    const model = this.getModel(params.model);
    const responseSchema = zodToGeminiSchema(params.responseSchema);
    responseSchema.title ??= params.schemaName;

    const response = await this.getGeminiClient().models.generateContent({
      model,
      contents: params.userPrompt,
      config: {
        ...buildGenerationConfig(params, 0.2),
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const rawJson = parseJsonResponse(response.text || '');
    const parsed = params.responseSchema.safeParse(rawJson);

    if (!parsed.success) {
      throw new Error('AI response could not be parsed into the expected format');
    }

    return {
      content: JSON.stringify(parsed.data),
      parsed: parsed.data,
      usage: mapGeminiUsage(response),
      model: response.modelVersion || model,
    };
  }

  /** Streaming completion — yields content chunks as they arrive */
  async *stream(params: CompletionParams): AsyncIterable<string> {
    const stream = await this.getGeminiClient().models.generateContentStream({
      model: this.getModel(params.model),
      contents: params.userPrompt,
      config: buildGenerationConfig(params, 0.5),
    });

    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }
}

/** Singleton gateway instance — reused across all AI features */
export const llmGateway = new LLMGateway();

function buildGenerationConfig(
  params: CompletionParams,
  defaultTemperature: number,
): GenerateContentConfig {
  return {
    systemInstruction: params.systemPrompt,
    temperature: params.temperature ?? defaultTemperature,
    maxOutputTokens: params.maxTokens || 4000,
  };
}

function mapGeminiUsage(response: GenerateContentResponse): CompletionResult['usage'] {
  const usage = response.usageMetadata;

  return {
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
    totalTokens: usage?.totalTokenCount || 0,
  };
}

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('AI response could not be parsed into the expected format');
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fencedJson?.[1]) {
      throw new Error('AI response could not be parsed into the expected format');
    }

    try {
      return JSON.parse(fencedJson[1].trim());
    } catch {
      throw new Error('AI response could not be parsed into the expected format');
    }
  }
}

function zodToGeminiSchema(schema: z.ZodType<unknown>): Schema {
  const { schema: baseSchema, nullable, description } = unwrapZodSchema(schema);
  const withMeta = (geminiSchema: Schema): Schema => ({
    ...geminiSchema,
    ...(description ? { description } : {}),
    ...(nullable ? { nullable: true } : {}),
  });

  if (baseSchema instanceof z.ZodObject) {
    const shape = baseSchema.shape as Record<string, z.ZodType<unknown>>;
    const properties: Record<string, Schema> = {};
    const required: string[] = [];

    Object.entries(shape).forEach(([key, value]) => {
      properties[key] = zodToGeminiSchema(value);
      if (!unwrapZodSchema(value).optional) {
        required.push(key);
      }
    });

    return withMeta({
      type: Type.OBJECT,
      properties,
      ...(required.length > 0 ? { required } : {}),
      propertyOrdering: Object.keys(properties),
    });
  }

  if (baseSchema instanceof z.ZodArray) {
    const arraySchema = baseSchema as z.ZodArray<z.ZodType<unknown>>;
    return withMeta({
      type: Type.ARRAY,
      items: zodToGeminiSchema(arraySchema.element),
    });
  }

  if (baseSchema instanceof z.ZodEnum) {
    return withMeta({
      type: Type.STRING,
      format: 'enum',
      enum: [...baseSchema.options],
    });
  }

  if (baseSchema instanceof z.ZodString) {
    return withMeta({ type: Type.STRING });
  }

  if (baseSchema instanceof z.ZodNumber) {
    return withMeta({ type: baseSchema.isInt ? Type.INTEGER : Type.NUMBER });
  }

  if (baseSchema instanceof z.ZodBoolean) {
    return withMeta({ type: Type.BOOLEAN });
  }

  return withMeta({ type: Type.STRING });
}

function unwrapZodSchema(schema: z.ZodType<unknown>): {
  schema: z.ZodType<unknown>;
  optional: boolean;
  nullable: boolean;
  description?: string;
} {
  let current = schema;
  let optional = false;
  let nullable = false;

  while (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
    if (current instanceof z.ZodOptional) {
      optional = true;
      current = current.unwrap();
    } else {
      nullable = true;
      current = current.unwrap();
    }
  }

  return {
    schema: current,
    optional,
    nullable,
    description: schema.description || current.description,
  };
}
