import { describe, it, expect, vi, beforeEach } from 'vitest';

const geminiMocks = vi.hoisted(() => {
  process.env.GEMINI_API_KEY = 'test-gemini-key';

  return {
    generateContent: vi.fn(),
    generateContentStream: vi.fn(),
  };
});

vi.mock('@google/genai', () => {
  const MockGoogleGenAI = vi.fn().mockImplementation(() => ({
    models: {
      generateContent: geminiMocks.generateContent,
      generateContentStream: geminiMocks.generateContentStream,
    },
  }));

  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY',
      OBJECT: 'OBJECT',
      NULL: 'NULL',
    },
  };
});

import { LLMGateway } from '../llm-gateway';

describe('LLMGateway', () => {
  let gateway: LLMGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = new LLMGateway();
  });

  describe('complete', () => {
    it('returns content and usage from a standard Gemini completion', async () => {
      geminiMocks.generateContent.mockResolvedValue({
        text: 'Hello world',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
        modelVersion: 'gemini-3.5-flash',
      });

      const result = await gateway.complete({
        systemPrompt: 'You are a test assistant',
        userPrompt: 'Say hello',
      });

      expect(geminiMocks.generateContent).toHaveBeenCalledWith({
        model: 'gemini-3.5-flash',
        contents: 'Say hello',
        config: {
          systemInstruction: 'You are a test assistant',
          temperature: 0.3,
          maxOutputTokens: 4000,
        },
      });
      expect(result.content).toBe('Hello world');
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(5);
      expect(result.usage.totalTokens).toBe(15);
      expect(result.model).toBe('gemini-3.5-flash');
    });

    it('handles empty response content gracefully', async () => {
      geminiMocks.generateContent.mockResolvedValue({
        text: undefined,
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 0,
          totalTokenCount: 5,
        },
        modelVersion: 'gemini-3.5-flash',
      });

      const result = await gateway.complete({
        systemPrompt: 'system',
        userPrompt: 'user',
      });

      expect(result.content).toBe('');
    });
  });

  describe('completeStructured', () => {
    it('returns parsed object matching schema', async () => {
      const { z } = await import('zod');
      const TestSchema = z.object({ name: z.string(), age: z.number() });

      geminiMocks.generateContent.mockResolvedValue({
        text: '{"name":"Alice","age":30}',
        usageMetadata: {
          promptTokenCount: 20,
          candidatesTokenCount: 10,
          totalTokenCount: 30,
        },
        modelVersion: 'gemini-3.5-flash',
      });

      const result = await gateway.completeStructured({
        systemPrompt: 'system',
        userPrompt: 'user',
        responseSchema: TestSchema,
        schemaName: 'test_schema',
      });

      expect(geminiMocks.generateContent).toHaveBeenCalledWith({
        model: 'gemini-3.5-flash',
        contents: 'user',
        config: {
          systemInstruction: 'system',
          temperature: 0.2,
          maxOutputTokens: 4000,
          responseMimeType: 'application/json',
          responseSchema: {
            title: 'test_schema',
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              age: { type: 'NUMBER' },
            },
            required: ['name', 'age'],
            propertyOrdering: ['name', 'age'],
          },
        },
      });
      expect(result.parsed).toEqual({ name: 'Alice', age: 30 });
      expect(result.usage.totalTokens).toBe(30);
    });

    it('throws when parsing fails', async () => {
      const { z } = await import('zod');
      const TestSchema = z.object({ x: z.string() });

      geminiMocks.generateContent.mockResolvedValue({
        text: '{"x": 123}',
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 0,
          totalTokenCount: 5,
        },
        modelVersion: 'gemini-3.5-flash',
      });

      await expect(
        gateway.completeStructured({
          systemPrompt: 's',
          userPrompt: 'u',
          responseSchema: TestSchema,
          schemaName: 'fail',
        }),
      ).rejects.toThrow('AI response could not be parsed');
    });
  });

  describe('stream', () => {
    it('yields content chunks from Gemini streaming response', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: 'Hello' };
          yield { text: ' World' };
          yield { text: '!' };
        },
      };

      geminiMocks.generateContentStream.mockResolvedValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of gateway.stream({
        systemPrompt: 'system',
        userPrompt: 'user',
      })) {
        chunks.push(chunk);
      }

      expect(geminiMocks.generateContentStream).toHaveBeenCalledWith({
        model: 'gemini-3.5-flash',
        contents: 'user',
        config: {
          systemInstruction: 'system',
          temperature: 0.5,
          maxOutputTokens: 4000,
        },
      });
      expect(chunks).toEqual(['Hello', ' World', '!']);
    });

    it('skips chunks with no content', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: 'OK' };
          yield { text: undefined };
          yield { text: '' };
        },
      };

      geminiMocks.generateContentStream.mockResolvedValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of gateway.stream({
        systemPrompt: 's',
        userPrompt: 'u',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['OK']);
    });
  });
});
