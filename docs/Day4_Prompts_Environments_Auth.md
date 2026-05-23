# Day 4 Prompts: Environments, Variables & Auth Config

## Copy-Paste Ready Prompts for Claude Opus 4.6 in Antigravity

**Day:** 4 of 7 | **Features:** 4 (Environments, Variable Resolution, Auto-Complete, Auth Panel)  
**Prerequisites:** Day 3 working (auth, collections, sidebar)

---

## Quick Reference

| # | Feature | Prompt Type | Est. Time |
|:--|:--------|:------------|:----------|
| P17 | Backend Environments CRUD | 🏗️ Backend | 20 min |
| P18 | Frontend Environment Manager | 🎨 Frontend | 25 min |
| P19 | Variable Resolution Engine | 🏗️ Backend | 20 min |
| P20 | Variable Auto-Complete | 🎨 Frontend | 20 min |
| P21 | Auth Configuration Panel | 🎨 Frontend + 🏗️ Backend | 25 min |
| P22 | Environment Tests | 🧪 Testing | 10 min |

---

## ORCHESTRATOR PROMPT (Day 4)

```
Build environment variables and auth configuration for our API testing tool (Day 4).

Today's goal: Users can create environments (Dev/Staging/Prod) with variables, use {{variable_name}} in URLs/headers/body that resolve before execution, get auto-complete when typing {{, and configure API Key/Bearer/Basic auth.

Execute in order:
1. Backend Environments: model (name, userId, variables[{key,value,type,description}], isDefault), CRUD + setDefault endpoint
2. Frontend Environment Manager: environmentStore, selector dropdown in status bar, manager modal with variable editor
3. Variable Resolution Engine: backend resolver replaces {{var}} in URL/headers/params/body, supports 3-level nesting, integrate into executor
4. Variable Auto-Complete: detect {{ in URL/value inputs, show dropdown of available variables from active environment
5. Auth Configuration Panel: frontend tab for API Key/Bearer/Basic auth, backend auth-resolver injects auth into headers/params
6. Secret masking: variables with type="secret" show •••••• in list view

Use Skills files for patterns. Executor from Day 2 must accept environmentId and resolve variables before sending.
```

---

## Individual Feature Prompts

### P17: Backend Environments CRUD

```
[BE] Build the environments module at apps/api/src/modules/environments/.

1. models/Environment.model.ts:
   - Fields: name, userId (ref User), variables[{key, value, type: text|secret, description}], isDefault
   - Index: {userId: 1}

2. environment.service.ts:
   - create(userId, name, variables[]): create environment
   - list(userId): return all envs, MASK secret values as "••••••"
   - getById(userId, envId): return with real values (for the owner only)
   - getVariables(userId, envId): return Record<string, string> of key→value
   - update(userId, envId, updates): partial update
   - delete(userId, envId): remove
   - setDefault(userId, envId): unset all others, set this as default

3. environment.controller.ts + routes:
   - POST /api/environments — create
   - GET /api/environments — list (masked secrets)
   - GET /api/environments/:id — get with real values
   - PATCH /api/environments/:id — update
   - DELETE /api/environments/:id — delete
   - PATCH /api/environments/:id/default — set default

4. Zod schemas: createEnvironmentSchema, updateEnvironmentSchema

All routes require authenticate middleware.
```

### P18: Frontend Environment Manager

```
[FE] Build environment management UI.

1. stores/environmentStore.ts (Zustand):
   - State: environments[], activeEnvironmentId (persisted in localStorage)
   - Actions: fetchEnvironments, setActiveEnvironment(id), getActiveVariables(): Record<string,string>, getVariableNames(): string[]

2. components/environment/EnvSelector.tsx:
   - Dropdown in the status bar or top bar area
   - Shows active environment name with colored dot (green=dev, orange=staging, red=prod)
   - Dropdown lists all environments
   - "Manage Environments" link at bottom opens modal

3. components/environment/EnvManagerModal.tsx:
   - Two-panel layout: left=environment list with add/delete, right=variable editor
   - Left panel: list of environment names, click to select, "+" to create new
   - Right panel: KeyValueEditor extended with type toggle (text/secret)
   - Secret rows: show •••••• with eye icon to reveal
   - Save button per environment

4. Pass activeEnvironmentId to executor when sending requests

Premium design: modal with backdrop blur, smooth panel transitions.
```

### P19: Variable Resolution Engine

```
[BE] Build the variable resolver and integrate into executor.

1. modules/executor/variable-resolver.ts:
   class VariableResolver:
   - constructor(variables: Record<string, string>)
   - resolve(input: string): string — replace all {{variable_name}} patterns
     - Support nested resolution ({{host}}/api where host={{protocol}}://example.com) up to 3 levels
     - Unresolved variables stay as-is (don't crash)
   - resolveKeyValues(pairs[{key, value, enabled}]): Record<string, string> — resolve both keys and values
   - resolveBody(body: {mode, content}): any — resolve content string, JSON.parse for json mode

2. modules/executor/auth-resolver.ts:
   class AuthResolver:
   - resolve(auth, variableResolver): {headers: {}, params: {}}
   - API Key: resolve key+value → add to header or query param
   - Bearer: resolve token → Authorization: Bearer {token}
   - Basic: resolve user+pass → Authorization: Basic {base64}

3. Update executor.controller.ts:
   - Accept environmentId in request body
   - Fetch variables: environmentService.getVariables(userId, envId)
   - Create VariableResolver with those variables
   - Resolve: URL, headers, params, body, auth → then execute
   - Return both original and resolved values in response

4. Update frontend executor.service.ts: include environmentId from environmentStore
```

### P20: Variable Auto-Complete

```
[FE] Build variable auto-complete at apps/web/src/components/common/VariableInput/.

1. VariableInput.tsx:
   - Wraps a standard <input> element
   - Detects when user types "{{" → shows dropdown below cursor position
   - Dropdown lists variable names from environmentStore.getVariableNames()
   - As user types after "{{", filter the list (e.g., "{{ba" matches "base_url")
   - Click or Enter: insert "{{variable_name}}" at cursor position
   - Escape: close dropdown
   - Visual: variables in the input render with subtle highlight (optional for MVP)

2. Apply VariableInput to:
   - URL bar input (replace standard input in UrlBar.tsx)
   - Value inputs in KeyValueEditor
   - Token input in auth bearer config

3. Dropdown styling:
   - Position: absolute below the input, aligned to cursor
   - Max height: 200px, scrollable
   - Each item: variable name + preview value (truncated)
   - Background: var(--color-bg-elevated), border, shadow-lg
   - Keyboard: arrow keys to navigate, Enter to select

Simple MVP approach: use a regular input with a positioned dropdown overlay.
```

### P21: Auth Configuration Panel

```
[FE+BE] Build the auth configuration tab in the request builder.

1. components/request-builder/AuthConfig.tsx + .module.css:
   - Auth type selector: None | API Key | Bearer Token | Basic Auth
   
   None: "This request does not use any authorization"
   
   API Key:
   - Key input (e.g., "X-API-Key") with VariableInput
   - Value input with VariableInput
   - "Add to" radio: Header | Query Parameter
   
   Bearer Token:
   - Token input (supports {{variables}}) with VariableInput
   - Preview below: "Authorization: Bearer {resolved_value}"
   
   Basic Auth:
   - Username input with VariableInput
   - Password input (type=password, eye toggle) with VariableInput
   - Preview below: "Authorization: Basic {base64_preview}"

2. Store: auth state already exists in requestStore (auth field per tab)
3. Backend: auth-resolver.ts handles injection (built in P19)

All inputs use our design system. Labels in secondary text. Inputs with border, rounded.
```

### P22: Environment Tests

```
[TEST] Write tests for the variable resolution engine.

apps/api/src/modules/executor/__tests__/variable-resolver.test.ts:
- Simple replacement: "{{base_url}}/posts" → "https://api.example.com/posts"
- Multiple variables: "{{protocol}}://{{host}}/{{path}}"
- Nested resolution: host="{{protocol}}://example.com" + protocol="https" → resolves in 2 passes
- Missing variable: "{{unknown}}" stays as "{{unknown}}" (no crash)
- Empty input: "" → ""
- No variables: "plain text" → "plain text"
- Whitespace in key: "{{ base_url }}" → resolves (trim key)
- resolveKeyValues: only enabled=true pairs, resolves both key and value
- resolveBody json mode: resolves variables inside JSON string, returns parsed object

Use Vitest. No mocks needed — VariableResolver is pure logic.
```

---

## Sub-Agent Delegation Map (Day 4)

```
ORCHESTRATOR
├── Backend Sub-Agent:  P17 (env CRUD) → P19 (resolver + auth-resolver)
├── Frontend Sub-Agent: P18 (env manager) → P20 (auto-complete) → P21 (auth panel)
└── Testing Sub-Agent: P22 (resolver tests)
```

---

*End of Day 4 Prompts. Refer to Day4_Guide for detailed implementations.*
