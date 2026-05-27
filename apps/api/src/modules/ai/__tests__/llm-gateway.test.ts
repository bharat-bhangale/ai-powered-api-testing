import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the openai module before importing anything that uses it
vi.mock('openai', () => {
  const MockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
        parse: vi.fn(),
      },
    },
  }));
  return { default: MockOpenAI };
});

// Must import AFTER mocking
import { LLMGateway } from '../llm-gateway';

describe('LLMGateway', () => {
  let gateway: LLMGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = new LLMGateway();
  });

  describe('complete', () => {
    it('returns content and usage from a standard completion', async () => {
      // Access the mocked openai instance
      const openaiInstance = (gateway as any).openai;
      openaiInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Hello world' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-4o-mini',
      });

      const result = await gateway.complete({
        systemPrompt: 'You are a test assistant',
        userPrompt: 'Say hello',
      });

      expect(result.content).toBe('Hello world');
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(5);
      expect(result.usage.totalTokens).toBe(15);
      expect(result.model).toBe('gpt-4o-mini');
    });

    it('handles empty response content gracefully', async () => {
      const openaiInstance = (gateway as any).openai;
      openaiInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
        model: 'gpt-4o-mini',
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

      const openaiInstance = (gateway as any).openai;
      openaiInstance.chat.completions.parse.mockResolvedValue({
        choices: [{ message: { parsed: { name: 'Alice', age: 30 } } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        model: 'gpt-4o-mini',
      });

      const result = await gateway.completeStructured({
        systemPrompt: 'system',
        userPrompt: 'user',
        responseSchema: TestSchema,
        schemaName: 'test_schema',
      });

      expect(result.parsed).toEqual({ name: 'Alice', age: 30 });
      expect(result.usage.totalTokens).toBe(30);
    });

    it('throws when parsing fails (null parsed)', async () => {
      const { z } = await import('zod');
      const TestSchema = z.object({ x: z.string() });

      const openaiInstance = (gateway as any).openai;
      openaiInstance.chat.completions.parse.mockResolvedValue({
        choices: [{ message: { parsed: null } }],
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
        model: 'gpt-4o-mini',
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
    it('yields content chunks from streaming response', async () => {
      const openaiInstance = (gateway as any).openai;

      // Simulate an async iterable stream
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'Hello' } }] };
          yield { choices: [{ delta: { content: ' World' } }] };
          yield { choices: [{ delta: { content: '!' } }] };
        },
      };

      openaiInstance.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of gateway.stream({
        systemPrompt: 'system',
        userPrompt: 'user',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' World', '!']);
    });

    it('skips chunks with no content', async () => {
      const openaiInstance = (gateway as any).openai;

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: 'OK' } }] };
          yield { choices: [{ delta: {} }] };
          yield { choices: [{ delta: { content: null } }] };
        },
      };

      openaiInstance.chat.completions.create.mockResolvedValue(mockStream);

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
