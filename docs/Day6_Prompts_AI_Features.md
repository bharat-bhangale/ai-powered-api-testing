# Day 6 Prompts: AI Features

## Copy-Paste Ready Prompts for Claude Opus 4.6 in Antigravity

**Day:** 6 of 7 | **Features:** 3 (AI Chat, Test Generation, Debug Assistant)  
**Prerequisites:** Day 5 working (history, import/export)

---

## Quick Reference

| # | Feature | Prompt Type | Est. Time |
|:--|:--------|:------------|:----------|
| P29 | LLM Gateway | 🏗️ Backend | 20 min |
| P30 | Prompt Templates | 🏗️ Backend | 15 min |
| P31 | AI Chat (Backend + Frontend) | 🏗️🎨 Full Stack | 30 min |
| P32 | AI Test Generation | 🏗️🎨 Full Stack | 25 min |
| P33 | AI Debug Assistant | 🏗️🎨 Full Stack | 25 min |
| P34 | AI Usage Tracking | 🏗️🎨 Full Stack | 10 min |
| P35 | AI Feature Tests | 🧪 Testing | 10 min |

---

## ORCHESTRATOR PROMPT (Day 6)

```
Build AI features for our API testing tool (Day 6). This is our core differentiator.

Today's goal: Users can chat with an AI about their API requests/responses, generate test assertions from responses with one click, and get instant debugging help on error responses.

Execute in order:
1. LLM Gateway: provider-agnostic service wrapping OpenAI — standard completion, structured output (Zod+zodResponseFormat), and streaming
2. Prompt templates: system prompts and user prompt builders for test generation and debug analysis
3. AI Chat: SSE streaming endpoint + persistent sidebar chat panel with context-aware prompts (current request+response)
4. AI Test Generation: structured output (Zod schema) → checklist UI with accept/reject per test
5. AI Debug Assistant: structured output → diagnosis + fix suggestions panel, auto-triggered on 4xx/5xx
6. Usage tracking: daily counter per user (50/day limit), badge in status bar
7. AI Routes: POST /api/ai/chat, /api/ai/generate-tests, /api/ai/debug — all authenticated

Tech: OpenAI GPT-4o-mini default. Use zodResponseFormat for structured outputs. SSE for chat streaming.
Install: npm install openai zod --workspace=apps/api (zod likely already installed)
```

---

## Individual Feature Prompts

### P29: LLM Gateway

```
[BE] Build the LLM Gateway at apps/api/src/modules/ai/llm-gateway.ts.

Install: npm install openai --workspace=apps/api

class LLMGateway:
  constructor: creates OpenAI client from OPENAI_API_KEY env var

  complete(params): Promise<{content, usage, model}>
  - Params: systemPrompt, userPrompt, model?(default gpt-4o-mini), temperature?(0.3), maxTokens?(4000)
  - Uses openai.chat.completions.create with messages [{role:system}, {role:user}]
  - Returns: content, usage{promptTokens, completionTokens, totalTokens}, model

  completeStructured<T>(params): Promise<{content, parsed: T, usage, model}>
  - Additional params: responseSchema (Zod), schemaName (string)
  - Uses openai.beta.chat.completions.parse with response_format: zodResponseFormat(schema, name)
  - Returns parsed object matching the Zod schema
  - Throws if parsing fails

  *stream(params): AsyncIterable<string>
  - Same params as complete but adds stream: true
  - Yields content chunks as they arrive
  - Uses for await...of on the OpenAI stream

Export singleton: export const llmGateway = new LLMGateway()

Design: provider-agnostic interface. Only the constructor knows about OpenAI — feature services call gateway methods.
```

### P30: Prompt Templates

```
[BE] Create prompt templates at apps/api/src/modules/ai/prompts/.

1. test-generation.prompt.ts:
   TEST_GEN_SYSTEM_PROMPT: Expert API testing engineer prompt
   - Rules: use atx.test() and atx.expect() API (NOT pm.)
   - API reference: atx.test(name, fn), atx.expect(actual).toBe/toBeType/toBeGreaterThan/toContain/toHaveProperty/toBeTruthy
   - Access: atx.response.status, .body, .headers, .timing.total
   - Categories: status, body_structure, data_validation, performance, edge_case
   - Generate 6-10 tests per response

   buildTestGenUserPrompt(request, response): string
   - Include: method, URL, status, timing, selected headers, truncated body (max 3000 chars)

2. debug-analysis.prompt.ts:
   DEBUG_SYSTEM_PROMPT: Expert API debugging assistant prompt
   - Analysis approach: check status code meaning, response body errors, request mistakes, endpoint patterns
   - Common issues: 401/403/404/405/415/422/429/500 + CORS + network errors
   
   buildDebugUserPrompt(request, response): string
   - Include: method, URL, request headers, request body, response status, response headers, response body (truncated)

Prompt efficiency: truncate large bodies, select only important headers, use clear formatting.
```

### P31: AI Chat (Full Stack)

```
[BE+FE] Build the AI chat feature.

Backend (apps/api/src/modules/ai/features/chat.service.ts):
- chatStream(message, context?): AsyncIterable<string>
  - System prompt: expert API testing assistant, capabilities list, rules (concise, use code examples, reference context)
  - If context.currentRequest exists: prepend "CONTEXT:\nRequest: METHOD URL\n" + response status/body
  - Delegates to llmGateway.stream()

Backend (ai.controller.ts — chat handler):
- Set SSE headers: Content-Type text/event-stream, Cache-Control no-cache, Connection keep-alive
- Stream chunks: res.write(`data: ${JSON.stringify({content: chunk})}\n\n`)
- End: res.write(`data: ${JSON.stringify({done: true})}\n\n`)

Frontend:

1. stores/aiStore.ts (Zustand):
   - State: messages[{id, role, content, timestamp}], isStreaming, isPanelOpen
   - Actions: addMessage(role, content), appendToLastMessage(text), setStreaming(bool), togglePanel(), clearMessages()

2. components/ai/AIChatPanel.tsx + .module.css:
   - Fixed sidebar panel (360px) on the right, slides in/out
   - Header: "AI Assistant" + sparkle icon + close button + clear chat button
   - Message list (scrollable): user messages right-aligned, assistant left-aligned
   - Message bubbles: user=primary color bg, assistant=surface bg
   - Streaming: assistant message builds up character-by-character
   - Quick action buttons above input: "Explain response", "Suggest tests", "Debug error"
   - Input bar: text input + send button, disabled during streaming
   - Send: fetch(/api/ai/chat, POST, SSE) → read stream → appendToLastMessage per chunk

3. Toggle: sparkle (✨) icon button in top bar — toggles isPanelOpen

Context: automatically include current tab's request config + response when sending messages.
```

### P32: AI Test Generation

```
[BE+FE] Build AI test generation.

Backend (features/test-generator.service.ts):
- Zod schemas:
  TestSchema: {name, category: status|body_structure|data_validation|performance|edge_case, assertion, script}
  TestSuiteSchema: {tests: TestSchema[], summary}
- generateTests(request, response): calls llmGateway.completeStructured with TestSuiteSchema
- Returns parsed TestSuite with guaranteed structure

Backend route: POST /api/ai/generate-tests (authenticated)
- Body: {request: {method, url}, response: {status, statusText, headers, body, timing}}
- Returns: {success: true, data: {tests[], summary}}

Frontend (components/ai/AITestSuggestions.tsx + .module.css):
- Triggered by "Generate Tests ✨" button in response viewer (only visible when response exists)
- Loading: skeleton animation with "AI is analyzing your response..." text
- Results panel:
  - Summary line at top
  - Each test: checkbox (checked by default) + name + category badge + script code block
  - Script: syntax highlighted in a mini code block
  - Category badges: colored by type (status=green, body=blue, data=purple, performance=orange, edge=gray)
- Actions: "Apply Selected" (copies scripts to clipboard), "Copy All", "Dismiss"
- Animate in with fadeInUp when results arrive

Integration: button disabled when isLoading. Show error toast if AI fails.
```

### P33: AI Debug Assistant

```
[BE+FE] Build the AI debug assistant.

Backend (features/debug-assistant.service.ts):
- Zod schemas:
  DebugAnalysisSchema: {
    diagnosis: {cause, confidence: high|medium|low, explanation},
    suggestions: [{title, description, code?, priority: critical|recommended|optional}],
    relatedDocs: string[]?
  }
- analyze(request, response): calls llmGateway.completeStructured with DebugAnalysisSchema

Backend route: POST /api/ai/debug (authenticated)
- Body: {request: {method, url, headers, body}, response: {status, statusText, headers, body}}

Frontend (components/ai/AIDebugPanel.tsx + .module.css):
- Auto-trigger: when response status >= 400, show "🔍 Debug with AI" button in response viewer
- Loading: "AI is analyzing the error..." with pulse animation
- Results panel:
  - DIAGNOSIS section: cause text + confidence badge (high=green, medium=yellow, low=red)
  - Explanation paragraph
  - SUGGESTED FIXES section: ordered by priority
    - Critical: 🔴 red icon prefix
    - Recommended: 🟡 yellow icon prefix
    - Optional: 💡 gray prefix
  - Each suggestion: title (bold), description, optional code block
  - Code blocks: mono font, copy button
- Actions: "Apply Fix" (opens chat with context), "Ask Follow-Up" (opens AI chat), "Dismiss"
- Animate in with scaleIn

Show maximum 1 debug analysis at a time. New analysis replaces old.
```

### P34: AI Usage Tracking

```
[BE+FE] Build AI usage tracking.

Backend (modules/ai/utils/usage-tracker.ts):
- In-memory Map<userId, {count, resetDate}> for MVP
- canUse(userId): boolean — check if under DAILY_LIMIT (50)
- increment(userId): {used, limit, remaining}
- getUsage(userId): {used, limit, remaining}
- Reset daily: compare resetDate with today

Integration:
- In AI controller: check canUse() before processing → 429 if exceeded
- After processing: increment() → include usage in response headers (X-AI-Usage-Remaining)
- Route: GET /api/ai/usage (authenticated) → returns current usage

Frontend (components/ai/AIUsageIndicator.tsx):
- Small badge: "✨ 45/50" in status bar
- Color: green (<70%), yellow (70-90%), red (>90%)
- Tooltip: "AI requests today. Resets at midnight."
- Update after every AI request (read from response header)
```

### P35: AI Feature Tests

```
[TEST] Write tests for AI services.

1. apps/api/src/modules/ai/__tests__/llm-gateway.test.ts:
   - Mock OpenAI client
   - complete(): returns content and usage
   - completeStructured(): returns parsed object matching schema
   - stream(): yields chunks

2. apps/api/src/modules/ai/__tests__/usage-tracker.test.ts:
   - Fresh user: canUse=true, used=0
   - After 50 increments: canUse=false
   - Day change: resets counter
   - getUsage: returns correct counts

Use Vitest. vi.mock('openai') for gateway tests.
```

---

## Sub-Agent Delegation Map (Day 6)

```
ORCHESTRATOR
├── Backend Sub-Agent:  P29 (gateway) → P30 (prompts) → P31-BE (chat SSE) → P32-BE (test gen) → P33-BE (debug) → P34-BE (usage)
├── Frontend Sub-Agent: P31-FE (chat panel) → P32-FE (test suggestions) → P33-FE (debug panel) → P34-FE (usage badge)
└── Testing Sub-Agent: P35 (AI tests)
```

---

*End of Day 6 Prompts. Refer to Day6_Guide_AI_Features.md for detailed implementations.*
