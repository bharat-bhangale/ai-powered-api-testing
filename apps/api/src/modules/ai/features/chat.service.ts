import { llmGateway } from '../llm-gateway';

const CHAT_SYSTEM_PROMPT = `You are an expert API testing assistant embedded in an API testing tool (similar to Postman).

Your capabilities:
- Explain API responses, HTTP status codes, and headers
- Suggest how to fix errors
- Help write test assertions
- Explain authentication flows
- Generate sample request data
- Answer general API development questions

Rules:
- Be concise but thorough
- Use code examples when helpful
- Reference the user's current request/response context when available
- Format responses with markdown
`;

interface ChatContext {
  currentRequest?: { method: string; url: string };
  currentResponse?: { status: number; body: unknown };
}

/**
 * Chat Service — context-aware AI chat with streaming support.
 * Automatically includes the user's current request/response as context.
 */
export class ChatService {
  /** Non-streaming chat (returns full text) */
  async chat(message: string, context?: ChatContext): Promise<string> {
    const userPrompt = this.buildPrompt(message, context);

    const result = await llmGateway.complete({
      systemPrompt: CHAT_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.5,
    });

    return result.content;
  }

  /** Streaming chat (yields token chunks via SSE) */
  async *chatStream(message: string, context?: ChatContext): AsyncIterable<string> {
    const userPrompt = this.buildPrompt(message, context);

    for await (const chunk of llmGateway.stream({
      systemPrompt: CHAT_SYSTEM_PROMPT,
      userPrompt,
    })) {
      yield chunk;
    }
  }

  /** Build context-aware user prompt */
  private buildPrompt(message: string, context?: ChatContext): string {
    if (!context?.currentRequest && !context?.currentResponse) {
      return message;
    }

    let prompt = 'CONTEXT:\n';
    if (context?.currentRequest) {
      prompt += `Current Request: ${context.currentRequest.method} ${context.currentRequest.url}\n`;
    }
    if (context?.currentResponse) {
      prompt += `Response Status: ${context.currentResponse.status}\n`;
      prompt += `Response Body: ${JSON.stringify(context.currentResponse.body).substring(0, 2000)}\n`;
    }
    prompt += `\nUSER QUESTION:\n${message}`;
    return prompt;
  }
}
