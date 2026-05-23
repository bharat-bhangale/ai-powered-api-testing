# Day 4 Guide: Environments, Variables & Auth Configuration

**Sprint Day:** 4 of 7  
**Goal:** Users can switch environments, use `{{variables}}`, and configure auth  
**Features:** Environment Management, Variable Resolution, Auto-Complete, Auth Config Panel

---

## Table of Contents

1. [Backend Environment Module](#1-backend-environment-module)
2. [Frontend Environment Manager](#2-frontend-environment-manager)
3. [Variable Resolution Engine](#3-variable-resolution-engine)
4. [Variable Auto-Complete](#4-variable-auto-complete)
5. [Auth Configuration Panel](#5-auth-configuration-panel)
6. [Antigravity Prompts for Day 4](#6-antigravity-prompts-for-day-4)

---

## 1. Backend Environment Module

### What We're Building
CRUD endpoints for environments. Each environment has a name and a list of key-value variables. Secret variables are flagged and should be masked in API responses.

### Step-by-Step

#### Step 1.1: Environment Model

Create `apps/api/src/models/Environment.model.ts`:
```typescript
import mongoose, { Document } from 'mongoose';

export interface IEnvironment extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  variables: Array<{
    key: string;
    value: string;
    type: 'text' | 'secret';
    description: string;
  }>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const environmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  variables: [{
    key: { type: String, required: true },
    value: { type: String, default: '' },
    type: { type: String, enum: ['text', 'secret'], default: 'text' },
    description: { type: String, default: '' },
  }],
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

environmentSchema.index({ userId: 1 });

export const Environment = mongoose.model<IEnvironment>('Environment', environmentSchema);
```

#### Step 1.2: Environment Service

Create `apps/api/src/modules/environments/environment.service.ts`:
```typescript
import { Environment, IEnvironment } from '../../models/Environment.model';

export class EnvironmentService {
  async create(userId: string, name: string, variables: any[] = []): Promise<IEnvironment> {
    const env = new Environment({ name, userId, variables });
    return env.save();
  }

  async list(userId: string): Promise<IEnvironment[]> {
    const envs = await Environment.find({ userId }).sort({ name: 1 });
    // Mask secret values in response
    return envs.map(env => {
      const masked = env.toObject();
      masked.variables = masked.variables.map((v: any) => ({
        ...v,
        value: v.type === 'secret' ? '••••••' : v.value,
      }));
      return masked;
    }) as IEnvironment[];
  }

  async getById(userId: string, envId: string): Promise<IEnvironment | null> {
    return Environment.findOne({ _id: envId, userId });
  }

  async getVariables(userId: string, envId: string): Promise<Record<string, string>> {
    const env = await Environment.findOne({ _id: envId, userId });
    if (!env) return {};
    
    const vars: Record<string, string> = {};
    env.variables.forEach(v => { vars[v.key] = v.value; });
    return vars;
  }

  async update(userId: string, envId: string, updates: Partial<IEnvironment>): Promise<IEnvironment | null> {
    return Environment.findOneAndUpdate(
      { _id: envId, userId },
      { $set: updates },
      { new: true }
    );
  }

  async delete(userId: string, envId: string): Promise<boolean> {
    const result = await Environment.deleteOne({ _id: envId, userId });
    return result.deletedCount > 0;
  }

  async setDefault(userId: string, envId: string): Promise<void> {
    await Environment.updateMany({ userId }, { isDefault: false });
    await Environment.findOneAndUpdate({ _id: envId, userId }, { isDefault: true });
  }
}
```

#### Step 1.3: Routes

```
POST   /api/environments           — Create environment
GET    /api/environments           — List environments
GET    /api/environments/:id       — Get environment with variables
PATCH  /api/environments/:id       — Update environment
DELETE /api/environments/:id       — Delete environment
PATCH  /api/environments/:id/default — Set as default
```

---

## 2. Frontend Environment Manager

### What We're Building
- **Environment Selector**: Dropdown in the top bar showing the active environment name, with a list of all environments
- **Environment Manager Modal**: Full CRUD for environments with variable editor
- **Variable Editor**: Key-value editor with type toggle (text/secret), description, and secret masking

### Key Implementation Points

#### Step 2.1: Environment Store (Zustand)

Create `apps/web/src/stores/environmentStore.ts`:
```typescript
import { create } from 'zustand';
import api from '../services/api';

interface Variable {
  key: string;
  value: string;
  type: 'text' | 'secret';
  description: string;
}

interface EnvironmentData {
  _id: string;
  name: string;
  variables: Variable[];
  isDefault: boolean;
}

interface EnvironmentStore {
  environments: EnvironmentData[];
  activeEnvironmentId: string | null;
  
  fetchEnvironments: () => Promise<void>;
  setActiveEnvironment: (id: string) => void;
  getActiveVariables: () => Record<string, string>;
  getVariableNames: () => string[];
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: [],
  activeEnvironmentId: null,

  fetchEnvironments: async () => {
    const res = await api.get('/api/environments');
    const envs = res.data.data.environments;
    const defaultEnv = envs.find((e: any) => e.isDefault);
    set({
      environments: envs,
      activeEnvironmentId: get().activeEnvironmentId || defaultEnv?._id || envs[0]?._id || null,
    });
  },

  setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),

  getActiveVariables: () => {
    const { environments, activeEnvironmentId } = get();
    const env = environments.find(e => e._id === activeEnvironmentId);
    if (!env) return {};
    
    const vars: Record<string, string> = {};
    env.variables.forEach(v => { vars[v.key] = v.value; });
    return vars;
  },

  getVariableNames: () => {
    const { environments, activeEnvironmentId } = get();
    const env = environments.find(e => e._id === activeEnvironmentId);
    if (!env) return [];
    return env.variables.map(v => v.key);
  },
}));
```

#### Step 2.2: Environment Selector Component

A dropdown in the top/status bar:
- Shows active environment name with a colored dot
- Dropdown lists all environments
- "Manage Environments" link at the bottom opens the manager modal
- Persists selection in localStorage

#### Step 2.3: Environment Manager Modal

Full CRUD modal with:
- Left panel: list of environments with add/delete buttons
- Right panel: variable editor (KeyValueEditor with type toggle)
- "Add Variable" button at the bottom
- Secret variables show `••••••` with a "reveal" button

---

## 3. Variable Resolution Engine

### What We're Building
Before executing a request, replace all `{{variable_name}}` placeholders in the URL, headers, params, and body with actual values from the active environment.

### Step-by-Step

#### Step 3.1: Backend Variable Resolver

Create `apps/api/src/modules/executor/variable-resolver.ts`:
```typescript
export class VariableResolver {
  private variables: Record<string, string>;

  constructor(variables: Record<string, string>) {
    this.variables = variables;
  }

  /**
   * Replace all {{variable}} patterns in a string
   * Supports nested resolution up to 3 levels deep
   */
  resolve(input: string): string {
    if (!input || typeof input !== 'string') return input;

    let result = input;
    let depth = 0;
    const maxDepth = 3;

    while (depth < maxDepth && result.includes('{{')) {
      result = result.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        if (trimmedKey in this.variables) {
          return this.variables[trimmedKey];
        }
        return match; // Keep unresolved variables as-is
      });
      depth++;
    }

    return result;
  }

  /**
   * Resolve variables in all values of a key-value pair array
   */
  resolveKeyValues(pairs: Array<{ key: string; value: string; enabled: boolean }>): Record<string, string> {
    const result: Record<string, string> = {};
    pairs.forEach(pair => {
      if (pair.enabled && pair.key) {
        result[this.resolve(pair.key)] = this.resolve(pair.value);
      }
    });
    return result;
  }

  /**
   * Resolve variables in a JSON body string
   */
  resolveBody(body: { mode: string; content: string }): any {
    if (!body || body.mode === 'none' || !body.content) return undefined;
    
    const resolvedContent = this.resolve(body.content);
    
    if (body.mode === 'json') {
      try {
        return JSON.parse(resolvedContent);
      } catch {
        return resolvedContent;
      }
    }
    
    return resolvedContent;
  }
}
```

#### Step 3.2: Integrate into Executor

Update `executor.controller.ts` to:
1. Accept `environmentId` in the request body
2. Fetch environment variables from database
3. Create `VariableResolver` with those variables
4. Resolve URL, headers, params, and body before executing

```typescript
// In executor controller:
const { environmentId } = req.body;

let variables: Record<string, string> = {};
if (environmentId) {
  const environmentService = new EnvironmentService();
  variables = await environmentService.getVariables(req.userId, environmentId);
}

const resolver = new VariableResolver(variables);
const resolvedUrl = resolver.resolve(config.url);
const resolvedHeaders = resolver.resolveKeyValues(config.headers);
const resolvedParams = resolver.resolveKeyValues(config.params);
const resolvedBody = resolver.resolveBody(config.body);
```

---

## 4. Variable Auto-Complete

### What We're Building
When users type `{{` in the URL input or any value field, show a dropdown of available variables from the active environment.

### Key Implementation Points

1. **Detection**: Listen for `{{` being typed
2. **Dropdown**: Show a positioned dropdown below the cursor with matching variable names
3. **Selection**: Click or Enter inserts `{{variable_name}}`
4. **Filtering**: As user types after `{{`, filter the list (e.g., typing `{{ba` shows `base_url`)
5. **Visual**: Variables in the URL bar render with a highlighted background (orange badge style)

### Implementation Approach

Create a custom `VariableInput` wrapper component that:
- Renders a contentEditable div (or hidden input + visual overlay)
- Detects `{{` pattern
- Shows dropdown from `useEnvironmentStore().getVariableNames()`
- Replaces the `{{...` text with the selected variable

**Simpler alternative for MVP**: Just highlight `{{...}}` patterns visually in the URL bar using a transparent overlay, and provide the auto-complete dropdown. The actual input remains a plain `<input>`.

---

## 5. Auth Configuration Panel

### What We're Building
A tab in the request builder where users configure authentication: API Key, Bearer Token, or Basic Auth. The auth config is injected into the request headers (or query params) by the executor.

### Step-by-Step

#### Step 5.1: Auth Config Component

Create `apps/web/src/components/request-builder/AuthConfig.tsx`:

```tsx
// Renders based on selected auth type:
// 
// None: Just a message "This request does not use any authorization"
//
// API Key:
//   - Key input (e.g., "X-API-Key")
//   - Value input (e.g., "abc123")
//   - "Add to" selector: Header or Query Param
//
// Bearer Token:
//   - Token input (supports {{variables}})
//   - Shows preview: "Authorization: Bearer <token>"
//
// Basic Auth:
//   - Username input
//   - Password input (type=password with show/hide toggle)
//   - Shows preview: "Authorization: Basic <base64>"
```

#### Step 5.2: Backend Auth Resolution

Create `apps/api/src/modules/executor/auth-resolver.ts`:
```typescript
export class AuthResolver {
  resolve(auth: any, resolver: VariableResolver): {
    headers: Record<string, string>;
    params: Record<string, string>;
  } {
    const result = { headers: {} as Record<string, string>, params: {} as Record<string, string> };

    if (!auth || auth.type === 'none') return result;

    switch (auth.type) {
      case 'apikey': {
        const key = resolver.resolve(auth.apiKey?.key || '');
        const value = resolver.resolve(auth.apiKey?.value || '');
        if (auth.apiKey?.addTo === 'query') {
          result.params[key] = value;
        } else {
          result.headers[key] = value;
        }
        break;
      }
      case 'bearer': {
        const token = resolver.resolve(auth.bearer?.token || '');
        result.headers['Authorization'] = `Bearer ${token}`;
        break;
      }
      case 'basic': {
        const username = resolver.resolve(auth.basic?.username || '');
        const password = resolver.resolve(auth.basic?.password || '');
        const encoded = Buffer.from(`${username}:${password}`).toString('base64');
        result.headers['Authorization'] = `Basic ${encoded}`;
        break;
      }
    }

    return result;
  }
}
```

Integrate into executor: merge auth headers/params with the request's headers/params before execution.

---

## 6. Antigravity Prompts for Day 4

### Prompt 1: Backend Environments
```
Build the Environments module at apps/api/src/modules/environments/:
1. Environment model: name, userId, variables[{key, value, type, description}], isDefault
2. EnvironmentService: create, list (mask secrets), getById, getVariables, update, delete, setDefault
3. Controller and routes (CRUD + set default)
4. Secret variables: mask value as "••••••" in list response, return real value only in getById

Routes: POST/GET/PATCH/DELETE /api/environments, PATCH /api/environments/:id/default
All routes protected with authenticate middleware.
```

### Prompt 2: Variable Resolution
```
Build the variable resolution engine at apps/api/src/modules/executor/variable-resolver.ts:
1. Replaces all {{variable_name}} patterns in strings
2. Methods: resolve(string), resolveKeyValues(pairs), resolveBody(body)
3. Supports nested resolution up to 3 levels deep
4. Unresolved variables stay as-is (don't crash)

Then integrate into executor.controller.ts:
- Accept environmentId in the request body
- Fetch variables from EnvironmentService.getVariables()
- Create VariableResolver and resolve URL, headers, params, body before execution

Also build auth-resolver.ts that handles API Key, Bearer, Basic auth injection.
```

### Prompt 3: Frontend Environments
```
Build frontend environment management:
1. environmentStore.ts (Zustand): environments, activeEnvironmentId, fetchEnvironments, setActiveEnvironment, getActiveVariables, getVariableNames
2. EnvSelector.tsx: dropdown in status bar showing active env, list of all envs
3. EnvManager.tsx: modal with env list + variable editor (KeyValueEditor with type toggle)
4. Variable auto-complete: when typing {{ in URL bar or value fields, show dropdown of variable names from active environment
5. AuthConfig.tsx: tab in request builder for API Key, Bearer Token, Basic Auth configuration

Persist active environment in localStorage.
Pass environmentId to executor API when sending requests.
```

---

*End of Day 4 Guide. Next: Open Day 5 Guide for History & Import/Export.*
