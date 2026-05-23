# Day 6 Guide: AI Features — Chat, Test Generation & Debug Assistant

**Sprint Day:** 6 of 7  
**Goal:** AI chat panel, AI-generated test assertions, AI debug assistant  
**Features:** LLM Gateway, AI Chat Panel, Test Generation, Debug Assistant, Usage Tracking

---

## Table of Contents

1. [Backend: LLM Gateway Architecture](#1-backend-llm-gateway-architecture)
2. [Backend: AI Feature Services](#2-backend-ai-feature-services)
3. [Backend: Prompt Engineering Templates](#3-backend-prompt-engineering-templates)
4. [Backend: AI Routes & Controller](#4-backend-ai-routes--controller)
5. [Frontend: AI Chat Panel](#5-frontend-ai-chat-panel)
6. [Frontend: AI Test Generation UI](#6-frontend-ai-test-generation-ui)
7. [Frontend: AI Debug Assistant UI](#7-frontend-ai-debug-assistant-ui)
8. [AI Usage Tracking](#8-ai-usage-tracking)
9. [Antigravity Prompts for Day 6](#9-antigravity-prompts-for-day-6)

---

## 1. Backend: LLM Gateway Architecture

### What We're Building
A provider-agnostic AI service that abstracts LLM calls. This lets you switch between OpenAI and Google Gemini without changing feature code.

### Step-by-Step

#### Step 1.1: Install Dependencies

```bash
npm install openai zod --workspace=apps/api
```

#### Step 1.2: LLM Gateway

Create `apps/api/src/modules/ai/llm-gateway.ts`:
```typescript
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

// ===== Types =====
interface CompletionParams {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseSchema?: z.ZodType<any>;  // For structured output
}

interface CompletionResult {
  content: string;
  parsed?: any;              // Parsed structured output
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

// ===== Gateway =====
export class LLMGateway {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Standard text completion
   */
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
      content: response.choices[0].message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
    };
  }

  /**
   * Structured output completion — returns parsed JSON matching the Zod schema
   */
  async completeStructured<T>(params: CompletionParams & { responseSchema: z.ZodType<T>; schemaName: string }): Promise<CompletionResult & { parsed: T }> {
    const response = await this.openai.beta.chat.completions.parse({
      model: params.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens || 4000,
      response_format: zodResponseFormat(params.responseSchema, params.schemaName),
    });

    const parsed = response.choices[0].message.parsed;
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

  /**
   * Streaming completion for chat
   */
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

// Singleton
export const llmGateway = new LLMGateway();
```

#### Step 1.3: Understanding the Key Design Decisions

| Decision | Rationale |
|:---------|:----------|
| **GPT-4o-mini as default** | Cheapest ($0.15/1M input tokens), fast, good for most tasks. Upgrade to GPT-4o for complex debugging. |
| **Structured outputs (Zod)** | Guarantees the AI returns valid JSON matching your schema. No parsing errors. |
| **Streaming** | Chat responses appear token-by-token — better UX, same cost. |
| **Singleton** | One gateway instance reused across all AI features — avoids creating multiple OpenAI clients. |

---

## 2. Backend: AI Feature Services

### 2.1: Test Generator Service

Create `apps/api/src/modules/ai/features/test-generator.service.ts`:
```typescript
import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import { TEST_GEN_SYSTEM_PROMPT, buildTestGenUserPrompt } from '../prompts/test-generation.prompt';

// ===== Zod Schema for Structured Output =====
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

export class TestGeneratorService {
  async generateTests(
    request: { method: string; url: string },
    response: { status: number; statusText: string; headers: any; body: any; timing: { total: number } }
  ): Promise<GeneratedTestSuite> {
    const result = await llmGateway.completeStructured({
      systemPrompt: TEST_GEN_SYSTEM_PROMPT,
      userPrompt: buildTestGenUserPrompt(request, response),
      responseSchema: TestSuiteSchema,
      schemaName: 'test_suite',
      temperature: 0.2,
      model: 'gpt-4o-mini',
    });

    return result.parsed;
  }
}
```

### 2.2: Debug Assistant Service

Create `apps/api/src/modules/ai/features/debug-assistant.service.ts`:
```typescript
import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import { DEBUG_SYSTEM_PROMPT, buildDebugUserPrompt } from '../prompts/debug-analysis.prompt';

const DebugAnalysisSchema = z.object({
  diagnosis: z.object({
    cause: z.string().describe('Most likely cause of the error'),
    confidence: z.enum(['high', 'medium', 'low']),
    explanation: z.string().describe('Detailed explanation of what went wrong'),
  }),
  suggestions: z.array(z.object({
    title: z.string(),
    description: z.string(),
    code: z.string().optional().describe('Code fix if applicable'),
    priority: z.enum(['critical', 'recommended', 'optional']),
  })),
  relatedDocs: z.array(z.string()).optional().describe('Relevant documentation links'),
});

export type DebugAnalysis = z.infer<typeof DebugAnalysisSchema>;

export class DebugAssistantService {
  async analyze(
    request: { method: string; url: string; headers: any; body: any },
    response: { status: number; statusText: string; headers: any; body: any }
  ): Promise<DebugAnalysis> {
    const result = await llmGateway.completeStructured({
      systemPrompt: DEBUG_SYSTEM_PROMPT,
      userPrompt: buildDebugUserPrompt(request, response),
      responseSchema: DebugAnalysisSchema,
      schemaName: 'debug_analysis',
      temperature: 0.3,
      model: 'gpt-4o-mini', // Use 4o for complex debugging
    });

    return result.parsed;
  }
}
```

### 2.3: Chat Service

Create `apps/api/src/modules/ai/features/chat.service.ts`:
```typescript
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

export class ChatService {
  async chat(
    message: string,
    context?: {
      currentRequest?: any;
      currentResponse?: any;
    }
  ): Promise<string> {
    let userPrompt = message;
    
    if (context?.currentRequest || context?.currentResponse) {
      userPrompt = `CONTEXT:\n`;
      if (context.currentRequest) {
        userPrompt += `Current Request: ${context.currentRequest.method} ${context.currentRequest.url}\n`;
      }
      if (context.currentResponse) {
        userPrompt += `Response Status: ${context.currentResponse.status}\n`;
        userPrompt += `Response Body: ${JSON.stringify(context.currentResponse.body).substring(0, 2000)}\n`;
      }
      userPrompt += `\nUSER QUESTION:\n${message}`;
    }

    const result = await llmGateway.complete({
      systemPrompt: CHAT_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.5,
    });

    return result.content;
  }

  async *chatStream(
    message: string,
    context?: { currentRequest?: any; currentResponse?: any }
  ): AsyncIterable<string> {
    let userPrompt = message;
    
    if (context?.currentRequest || context?.currentResponse) {
      userPrompt = `CONTEXT:\n`;
      if (context.currentRequest) {
        userPrompt += `Current Request: ${context.currentRequest.method} ${context.currentRequest.url}\n`;
      }
      if (context.currentResponse) {
        userPrompt += `Response Status: ${context.currentResponse.status}\n`;
        userPrompt += `Response Body: ${JSON.stringify(context.currentResponse.body).substring(0, 2000)}\n`;
      }
      userPrompt += `\nUSER QUESTION:\n${message}`;
    }

    for await (const chunk of llmGateway.stream({
      systemPrompt: CHAT_SYSTEM_PROMPT,
      userPrompt,
    })) {
      yield chunk;
    }
  }
}
```

---

## 3. Backend: Prompt Engineering Templates

### 3.1: Test Generation Prompt

Create `apps/api/src/modules/ai/prompts/test-generation.prompt.ts`:
```typescript
export const TEST_GEN_SYSTEM_PROMPT = `You are an expert API testing engineer. Generate comprehensive test assertions for API responses.

RULES:
1. Generate tests using the atx.test() and atx.expect() API
2. Each test must be a self-contained JavaScript function
3. Cover these categories: status, body_structure, data_validation, performance, edge_case
4. Use realistic assertion values based on the ACTUAL response data provided
5. Always include at least one response time performance assertion
6. For arrays, test length and item structure
7. For objects, test required field presence and data types
8. Generate 6-10 tests per response

SCRIPTING API:
- atx.test("test name", () => { ... })          // Define a test
- atx.expect(actual).toBe(expected)              // Exact equality
- atx.expect(actual).toBeType("string")          // Type check
- atx.expect(actual).toBeGreaterThan(n)          // Numeric comparison
- atx.expect(actual).toContain(substring)        // String/array contains
- atx.expect(actual).toHaveProperty("key")       // Object has key
- atx.expect(actual).toBeTruthy()                // Truthy check
- atx.response.status                            // Response status code
- atx.response.body                              // Parsed response body
- atx.response.headers                           // Response headers object
- atx.response.timing.total                      // Total response time in ms
`;

export function buildTestGenUserPrompt(
  request: { method: string; url: string },
  response: { status: number; statusText: string; headers: any; body: any; timing: { total: number } }
): string {
  return `Generate test assertions for this API response:

REQUEST:
  Method: ${request.method}
  URL: ${request.url}

RESPONSE:
  Status: ${response.status} ${response.statusText}
  Time: ${response.timing.total}ms
  Headers: ${JSON.stringify(selectHeaders(response.headers), null, 2)}
  Body: ${truncateBody(response.body, 3000)}

Generate a comprehensive test suite covering all categories.`;
}

function selectHeaders(headers: Record<string, string>): Record<string, string> {
  const important = ['content-type', 'content-length', 'cache-control', 'x-ratelimit-limit', 'x-ratelimit-remaining'];
  const result: Record<string, string> = {};
  Object.entries(headers).forEach(([k, v]) => {
    if (important.includes(k.toLowerCase())) result[k] = v;
  });
  return result;
}

function truncateBody(body: any, maxLength: number): string {
  const str = JSON.stringify(body, null, 2);
  if (str.length > maxLength) {
    return str.substring(0, maxLength) + '\n... (truncated)';
  }
  return str;
}
```

### 3.2: Debug Analysis Prompt

Create `apps/api/src/modules/ai/prompts/debug-analysis.prompt.ts`:
```typescript
export const DEBUG_SYSTEM_PROMPT = `You are an expert API debugging assistant. When a developer gets an error response from an API, you analyze the request and response to diagnose the problem.

ANALYSIS APPROACH:
1. First, identify the HTTP status code and its standard meaning
2. Examine the response body for error messages or codes
3. Check the request for common mistakes (wrong auth, missing headers, malformed body)
4. Consider the API endpoint pattern to infer expected behavior
5. Provide specific, actionable fix suggestions with code when possible

COMMON ISSUES TO CHECK:
- 401: Missing/expired/invalid auth token, wrong auth type
- 403: Insufficient permissions, IP restrictions, CORS
- 404: Wrong URL path, missing resource ID, API version mismatch
- 405: Wrong HTTP method for this endpoint
- 415: Missing Content-Type header, wrong content type
- 422: Request body validation failure, wrong field types
- 429: Rate limit exceeded
- 500: Server-side error (suggest retry, check API status page)
- CORS: Missing Access-Control headers (suggest proxy)
- Network: DNS failure, timeout, connection refused
`;

export function buildDebugUserPrompt(
  request: { method: string; url: string; headers: any; body: any },
  response: { status: number; statusText: string; headers: any; body: any }
): string {
  return `The developer sent this API request and got an error. Diagnose the problem:

REQUEST:
  Method: ${request.method}
  URL: ${request.url}
  Headers: ${JSON.stringify(request.headers, null, 2)}
  Body: ${request.body ? JSON.stringify(request.body).substring(0, 2000) : 'none'}

RESPONSE:
  Status: ${response.status} ${response.statusText}
  Headers: ${JSON.stringify(response.headers, null, 2)}
  Body: ${JSON.stringify(response.body).substring(0, 3000)}

Analyze this error and provide your diagnosis with specific fix suggestions.`;
}
```

---

## 4. Backend: AI Routes & Controller

Create `apps/api/src/modules/ai/ai.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { TestGeneratorService } from './features/test-generator.service';
import { DebugAssistantService } from './features/debug-assistant.service';
import { ChatService } from './features/chat.service';

const testGenerator = new TestGeneratorService();
const debugAssistant = new DebugAssistantService();
const chatService = new ChatService();

export async function generateTests(req: Request, res: Response) {
  try {
    const { request, response } = req.body;
    const result = await testGenerator.generateTests(request, response);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message: error.message } });
  }
}

export async function debugRequest(req: Request, res: Response) {
  try {
    const { request, response } = req.body;
    const result = await debugAssistant.analyze(request, response);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message: error.message } });
  }
}

export async function chat(req: Request, res: Response) {
  try {
    const { message, context } = req.body;
    
    // Set up SSE for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of chatService.chatStream(message, context)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message: error.message } });
  }
}
```

Create `apps/api/src/modules/ai/ai.routes.ts`:
```typescript
import { Router } from 'express';
import { generateTests, debugRequest, chat } from './ai.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.post('/generate-tests', authenticate, generateTests);
router.post('/debug', authenticate, debugRequest);
router.post('/chat', authenticate, chat);

export default router;
```

Register: `app.use('/api/ai', aiRoutes);`

---

## 5. Frontend: AI Chat Panel

### What We're Building
A persistent sidebar chat panel where users ask AI questions about their current request/response. Responses stream in token-by-token.

### Key Components

#### AI Store

Create `apps/web/src/stores/aiStore.ts`:
```typescript
import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  isPanelOpen: boolean;
  
  addMessage: (role: 'user' | 'assistant', content: string) => string;
  appendToLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  togglePanel: () => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  messages: [],
  isStreaming: false,
  isPanelOpen: false,

  addMessage: (role, content) => {
    const id = crypto.randomUUID();
    set((state) => ({
      messages: [...state.messages, { id, role, content, timestamp: Date.now() }],
    }));
    return id;
  },

  appendToLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + content };
      }
      return { messages };
    });
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  clearMessages: () => set({ messages: [] }),
}));
```

#### Chat Panel Component

Build `apps/web/src/components/ai/AIChatPanel.tsx`:
- Fixed sidebar panel (360px wide) on the right side
- Message list with user/assistant bubbles
- Input bar at the bottom with Send button
- Streaming: show AI response building up character by character
- Context: automatically includes current request/response
- Quick actions: "Explain this response", "Generate tests", "Debug this error"
- Toggle button in the top bar (sparkle icon from Lucide)

#### Streaming Integration

```typescript
async function sendMessage(message: string) {
  const { addMessage, appendToLastMessage, setStreaming } = useAIStore.getState();
  
  // Add user message
  addMessage('user', message);
  
  // Add empty assistant message
  addMessage('assistant', '');
  setStreaming(true);

  try {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
      },
      body: JSON.stringify({
        message,
        context: {
          currentRequest: getCurrentRequest(),
          currentResponse: getCurrentResponse(),
        },
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value);
      const lines = text.split('\n').filter(l => l.startsWith('data: '));
      
      for (const line of lines) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          appendToLastMessage(data.content);
        }
      }
    }
  } finally {
    setStreaming(false);
  }
}
```

---

## 6. Frontend: AI Test Generation UI

### What We're Building
After receiving a response, a "Generate Tests ✨" button appears. Clicking it sends the request+response to the AI, which returns test assertions displayed as an interactive checklist.

### Visual Design

```
┌──────────────────────────────────────────────┐
│ ✨ AI Generated Tests                    [×]  │
├──────────────────────────────────────────────┤
│ ✅ Status code is 200                        │
│    atx.expect(atx.response.status).toBe(200) │
│                                              │
│ ✅ Response has "data" property               │
│    atx.expect(atx.response.body)             │
│      .toHaveProperty("data")                 │
│                                              │
│ ☑️ Response time is under 500ms              │
│    atx.expect(atx.response.timing.total)     │
│      .toBeLessThan(500)                      │
│                                              │
│ ☑️ Data array has items                      │
│    atx.expect(atx.response.body.data.length) │
│      .toBeGreaterThan(0)                     │
│                                              │
│ [Apply Selected (4)]  [Copy All]  [Dismiss]  │
└──────────────────────────────────────────────┘
```

### Features
1. Each test shows name + script with syntax highlighting
2. Checkbox to select/deselect individual tests
3. "Apply Selected" → copies selected test scripts to the test editor
4. "Copy All" → copies all test scripts to clipboard
5. Loading state with skeleton animation while AI is generating
6. Category badges: status, body, data, performance, edge_case

---

## 7. Frontend: AI Debug Assistant UI

### What We're Building
When a 4xx/5xx response is received, show a "🔍 Debug with AI" button. Clicking it shows an analysis panel with diagnosis, fix suggestions, and relevant code.

### Visual Design

```
┌──────────────────────────────────────────────┐
│ 🔍 AI Debug Analysis                   [×]   │
├──────────────────────────────────────────────┤
│ DIAGNOSIS (Confidence: High)                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ The request is failing with 401 Unauthorized  │
│ because the Authorization header contains an  │
│ expired JWT token.                            │
│                                              │
│ SUGGESTED FIXES                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ 🔴 Critical: Refresh your auth token         │
│    Your token expired at 2024-05-23 10:30.    │
│    Re-login or use your refresh endpoint to   │
│    get a new access token.                    │
│                                              │
│ 🟡 Recommended: Check token format            │
│    Ensure the token starts with "Bearer "     │
│    (with a space) in the Authorization header │
│                                              │
│ 💡 Code Fix:                                  │
│    Authorization: Bearer {{new_token}}        │
│                                              │
│ [Apply Fix]  [Ask Follow-Up]  [Dismiss]      │
└──────────────────────────────────────────────┘
```

### Features
1. **Auto-trigger**: Show the debug button automatically when status >= 400
2. **Diagnosis**: Shows cause with confidence level (colored badge)
3. **Suggestions**: Prioritized list (critical → recommended → optional)
4. **Code fix**: Highlighted code block with "Apply" button
5. **Follow-up**: "Ask Follow-Up" opens the AI chat panel with context pre-filled
6. **Loading**: Skeleton loader while AI is analyzing

---

## 8. AI Usage Tracking

### What We're Building
Track daily AI usage per user. Show a badge: "45/50 AI requests used today". This enables future plan-based rate limiting.

### Backend Implementation

Create `apps/api/src/modules/ai/utils/usage-tracker.ts`:
```typescript
// Simple in-memory tracker for MVP
// In production, use Redis with daily TTL

const usageMap = new Map<string, { count: number; resetDate: string }>();

const DAILY_LIMIT = 50; // Free plan

export class UsageTracker {
  canUse(userId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    const usage = usageMap.get(userId);
    
    if (!usage || usage.resetDate !== today) {
      return true;
    }
    
    return usage.count < DAILY_LIMIT;
  }

  increment(userId: string): { used: number; limit: number; remaining: number } {
    const today = new Date().toISOString().split('T')[0];
    let usage = usageMap.get(userId);
    
    if (!usage || usage.resetDate !== today) {
      usage = { count: 0, resetDate: today };
    }
    
    usage.count++;
    usageMap.set(userId, usage);
    
    return {
      used: usage.count,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - usage.count,
    };
  }

  getUsage(userId: string): { used: number; limit: number; remaining: number } {
    const today = new Date().toISOString().split('T')[0];
    const usage = usageMap.get(userId);
    
    const count = (usage && usage.resetDate === today) ? usage.count : 0;
    return { used: count, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - count };
  }
}
```

### Frontend UI

Add `AIUsageIndicator.tsx`:
```
[✨ 45/50 AI requests today]
```
- Shows in the status bar or near the AI panel
- Color: green (< 70%), yellow (70-90%), red (> 90%)
- Tooltip: "Resets at midnight. Upgrade for more."

---

## 9. Antigravity Prompts for Day 6

### Prompt 1: LLM Gateway + Services
```
Build the AI module at apps/api/src/modules/ai/:

1. llm-gateway.ts: OpenAI-based LLM gateway with:
   - complete(): Standard text completion
   - completeStructured<T>(): Structured output with Zod schema (using zodResponseFormat)
   - stream(): Streaming completion (returns AsyncIterable<string>)
   - Default model: gpt-4o-mini
   - Singleton export: `llmGateway`

2. features/test-generator.service.ts:
   - Input: request (method, url) + response (status, headers, body, timing)
   - Output: { tests: [{ name, category, assertion, script }], summary }
   - Uses structured output with TestSuiteSchema (Zod)

3. features/debug-assistant.service.ts:
   - Input: request + response (with error status)
   - Output: { diagnosis: { cause, confidence, explanation }, suggestions: [{ title, description, code?, priority }] }
   - Uses structured output with DebugAnalysisSchema (Zod)

4. features/chat.service.ts:
   - Streaming chat using SSE
   - Context-aware: accepts current request/response as context
   - System prompt: expert API testing assistant

5. Prompt templates in prompts/ directory
6. Usage tracker with daily limits (50/day for free)
7. Routes: POST /api/ai/generate-tests, POST /api/ai/debug, POST /api/ai/chat
```

### Prompt 2: Frontend AI Components
```
Build frontend AI components:

1. aiStore.ts (Zustand): messages[], isStreaming, isPanelOpen, addMessage, appendToLastMessage, setStreaming, togglePanel, clearMessages

2. AIChatPanel.tsx: Persistent sidebar chat panel (360px)
   - Message bubbles (user: right-aligned, assistant: left-aligned)
   - Streaming response (text appears token-by-token)
   - Input bar with send button at bottom
   - Quick action buttons: "Explain response", "Generate tests", "Debug error"
   - Toggle with sparkle icon in top bar
   - SSE client for streaming responses from /api/ai/chat

3. AITestSuggestions.tsx: Test generation results panel
   - Shows generated tests as checklist with syntax-highlighted scripts
   - Select/deselect individual tests
   - "Apply Selected" and "Copy All" buttons
   - Category badges (status, body, performance, edge_case)
   - Triggered by "Generate Tests ✨" button in response viewer

4. AIDebugPanel.tsx: Debug analysis panel
   - Shows diagnosis with confidence badge
   - Prioritized fix suggestions with code blocks
   - "Apply Fix" and "Ask Follow-Up" buttons
   - Auto-appears on 4xx/5xx responses
   - "🔍 Debug with AI" button

5. AIUsageIndicator.tsx: "45/50 AI requests" badge in status bar

Use our design system (CSS Modules, CSS Variables). Dark theme. No Tailwind.
```

---

*End of Day 6 Guide. Next: Open Day 7 Guide for Polish, Theme & Deployment.*
