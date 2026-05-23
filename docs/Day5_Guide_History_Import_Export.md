# Day 5 Guide: History, cURL Import/Export & Postman Import

**Sprint Day:** 5 of 7  
**Goal:** Auto-save request history, import/export via cURL, import Postman collections  
**Features:** Request History, cURL Parser, cURL Export, Postman Collection Import

---

## Table of Contents

1. [Backend Request History](#1-backend-request-history)
2. [Frontend History Panel](#2-frontend-history-panel)
3. [cURL Import (Parser)](#3-curl-import-parser)
4. [cURL Export (Generator)](#4-curl-export-generator)
5. [Postman Collection Import](#5-postman-collection-import)
6. [Antigravity Prompts for Day 5](#6-antigravity-prompts-for-day-5)

---

## 1. Backend Request History

### What We're Building
Auto-save every request execution with its full request config, response data, and timing. Provide paginated, searchable, filterable list.

### Step-by-Step

#### Step 1.1: History Model

Create `apps/api/src/models/History.model.ts`:
```typescript
import mongoose, { Document } from 'mongoose';

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    size: number;
    timing: { total: number };
  };
  collectionId?: mongoose.Types.ObjectId;
  requestId?: mongoose.Types.ObjectId;
  environmentName?: string;
  executedAt: Date;
}

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  request: {
    method: String,
    url: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
  },
  response: {
    status: Number,
    statusText: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    size: Number,
    timing: {
      total: Number,
    },
  },
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection' },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedRequest' },
  environmentName: String,
  executedAt: { type: Date, default: Date.now },
});

// Index for user's history, newest first
historySchema.index({ userId: 1, executedAt: -1 });

// TTL: auto-delete after 90 days
historySchema.index({ executedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Text index for search
historySchema.index({ 'request.url': 'text' });

export const History = mongoose.model<IHistory>('History', historySchema);
```

#### Step 1.2: History Service

Create `apps/api/src/modules/history/history.service.ts`:
```typescript
import { History, IHistory } from '../../models/History.model';

export class HistoryService {
  async create(data: Partial<IHistory>): Promise<IHistory> {
    // Truncate response body if too large (> 500KB)
    if (data.response?.body) {
      const bodyStr = JSON.stringify(data.response.body);
      if (bodyStr.length > 500000) {
        data.response.body = {
          _truncated: true,
          _message: `Response body too large (${(bodyStr.length / 1024).toFixed(0)}KB). Truncated for storage.`,
          _preview: bodyStr.substring(0, 1000),
        };
      }
    }
    
    return History.create(data);
  }

  async list(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      method?: string;
      search?: string;
      status?: string; // "2xx" | "3xx" | "4xx" | "5xx"
    } = {}
  ): Promise<{ items: IHistory[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 50, method, search, status } = options;
    
    const query: any = { userId };
    
    if (method) query['request.method'] = method;
    
    if (status) {
      const statusNum = parseInt(status[0]);
      query['response.status'] = { $gte: statusNum * 100, $lt: (statusNum + 1) * 100 };
    }
    
    if (search) {
      query['request.url'] = { $regex: search, $options: 'i' };
    }

    const total = await History.countDocuments(query);
    const items = await History.find(query)
      .sort({ executedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      items: items as IHistory[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(userId: string, id: string): Promise<IHistory | null> {
    return History.findOne({ _id: id, userId });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await History.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }

  async clearAll(userId: string): Promise<number> {
    const result = await History.deleteMany({ userId });
    return result.deletedCount;
  }
}
```

#### Step 1.3: Auto-Save in Executor

Update the executor controller to auto-save to history after every execution:

```typescript
// After successful execution, save to history
if (req.userId) {
  const historyService = new HistoryService();
  await historyService.create({
    userId: req.userId,
    request: result.request,
    response: result.response,
    environmentName: environmentName || undefined,
  }).catch(err => console.error('Failed to save history:', err));
}
```

#### Step 1.4: History Routes

```
GET    /api/history           — List history (paginated, filterable)
GET    /api/history/:id       — Get single history entry
DELETE /api/history/:id       — Delete history entry
DELETE /api/history           — Clear all history
```

---

## 2. Frontend History Panel

### What We're Building
A sidebar/panel showing past requests grouped by time (Today, Yesterday, Last 7 Days, Older). Each entry shows method badge + URL + status + time.

### Key Implementation Points

#### Visual Design

```
📋 HISTORY                              [🔍 Search] [Clear All]
─────────────────────────────────────
▼ Today
  🟢 GET  https://api.example.com/users     200  245ms
  🟠 POST https://api.example.com/auth      201  502ms
  🔴 DELETE https://api.example.com/user/5   403  89ms

▼ Yesterday
  🟢 GET  https://jsonplaceholder.../posts   200  156ms
  🔵 PUT  https://api.example.com/user/3     200  334ms

▶ Last 7 Days (12 entries)
▶ Older (45 entries)
```

#### Features

1. **Time Grouping**: Group entries by Today / Yesterday / Last 7 Days / Older
2. **Search**: Filter by URL substring
3. **Method Filter**: Dropdown to filter by method
4. **Status Filter**: Filter by 2xx / 4xx / 5xx
5. **Click to Replay**: Click entry → populate request builder + show response
6. **Save to Collection**: Button to save a history entry to a collection
7. **Infinite Scroll**: Load more entries as user scrolls down

#### Store

Create `apps/web/src/stores/historyStore.ts`:
```typescript
import { create } from 'zustand';
import api from '../services/api';

interface HistoryEntry {
  _id: string;
  request: { method: string; url: string; headers: any; body: any };
  response: { status: number; statusText: string; timing: { total: number } };
  executedAt: string;
}

interface HistoryStore {
  entries: HistoryEntry[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;
  search: string;
  methodFilter: string | null;
  
  fetchHistory: () => Promise<void>;
  loadMore: () => Promise<void>;
  setSearch: (search: string) => void;
  setMethodFilter: (method: string | null) => void;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  isLoading: false,
  page: 1,
  hasMore: true,
  search: '',
  methodFilter: null,

  fetchHistory: async () => {
    set({ isLoading: true, page: 1 });
    const { search, methodFilter } = get();
    const params: any = { page: 1, limit: 50 };
    if (search) params.search = search;
    if (methodFilter) params.method = methodFilter;
    
    const res = await api.get('/api/history', { params });
    set({
      entries: res.data.data.items,
      hasMore: res.data.data.page < res.data.data.totalPages,
      isLoading: false,
    });
  },

  loadMore: async () => {
    const { page, hasMore } = get();
    if (!hasMore) return;
    
    const nextPage = page + 1;
    const res = await api.get('/api/history', { params: { page: nextPage, limit: 50 } });
    set({
      entries: [...get().entries, ...res.data.data.items],
      page: nextPage,
      hasMore: nextPage < res.data.data.totalPages,
    });
  },

  setSearch: (search) => { set({ search }); get().fetchHistory(); },
  setMethodFilter: (method) => { set({ methodFilter: method }); get().fetchHistory(); },
  
  clearHistory: async () => {
    await api.delete('/api/history');
    set({ entries: [], page: 1, hasMore: false });
  },
}));
```

---

## 3. cURL Import (Parser)

### What We're Building
User pastes a cURL command → parse it into method, URL, headers, body, auth → populate the request builder.

### Step-by-Step

#### Step 3.1: cURL Parser

Create `apps/web/src/utils/curl-parser.ts`:
```typescript
interface ParsedCurlRequest {
  method: string;
  url: string;
  headers: Array<{ id: string; key: string; value: string; description: string; enabled: boolean }>;
  params: Array<{ id: string; key: string; value: string; description: string; enabled: boolean }>;
  body: { mode: string; content: string };
  auth: { type: string; bearer?: { token: string }; basic?: { username: string; password: string } };
}

export function parseCurl(curlCommand: string): ParsedCurlRequest {
  // Normalize the input
  let cmd = curlCommand.trim();
  
  // Remove line continuations (backslash + newline)
  cmd = cmd.replace(/\\\s*\n/g, ' ');
  
  // Remove 'curl' prefix
  cmd = cmd.replace(/^curl\s+/, '');

  const result: ParsedCurlRequest = {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: { mode: 'none', content: '' },
    auth: { type: 'none' },
  };

  // Tokenize respecting quotes
  const tokens = tokenize(cmd);
  
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    
    switch (token) {
      case '-X':
      case '--request':
        i++;
        result.method = tokens[i]?.toUpperCase() || 'GET';
        break;

      case '-H':
      case '--header':
        i++;
        if (tokens[i]) {
          const headerStr = unquote(tokens[i]);
          const colonIdx = headerStr.indexOf(':');
          if (colonIdx > 0) {
            const key = headerStr.substring(0, colonIdx).trim();
            const value = headerStr.substring(colonIdx + 1).trim();
            
            // Check for auth headers
            if (key.toLowerCase() === 'authorization') {
              if (value.toLowerCase().startsWith('bearer ')) {
                result.auth = { type: 'bearer', bearer: { token: value.substring(7) } };
              } else if (value.toLowerCase().startsWith('basic ')) {
                const decoded = atob(value.substring(6));
                const [username, password] = decoded.split(':');
                result.auth = { type: 'basic', basic: { username, password } };
              }
            } else {
              result.headers.push({
                id: crypto.randomUUID(),
                key,
                value,
                description: '',
                enabled: true,
              });
            }
          }
        }
        break;

      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-binary':
        i++;
        if (tokens[i]) {
          const bodyContent = unquote(tokens[i]);
          result.body = { mode: 'raw', content: bodyContent };
          
          // Auto-detect JSON
          try {
            JSON.parse(bodyContent);
            result.body.mode = 'json';
          } catch {
            // Not JSON, keep as raw
          }
          
          // Auto-set method to POST if not explicitly set
          if (result.method === 'GET') result.method = 'POST';
        }
        break;

      case '-u':
      case '--user':
        i++;
        if (tokens[i]) {
          const [username, password] = unquote(tokens[i]).split(':');
          result.auth = { type: 'basic', basic: { username, password: password || '' } };
        }
        break;

      case '-L':
      case '--location':
        // Follow redirects — this is our default behavior
        break;

      case '-k':
      case '--insecure':
        // Skip SSL verification — noted but not used in MVP
        break;

      default:
        // If it looks like a URL (doesn't start with -)
        if (!token.startsWith('-') && (token.startsWith('http') || token.startsWith('"http') || token.startsWith("'http"))) {
          const urlStr = unquote(token);
          
          // Parse URL to extract query params
          try {
            const parsed = new URL(urlStr);
            result.url = `${parsed.origin}${parsed.pathname}`;
            
            parsed.searchParams.forEach((value, key) => {
              result.params.push({
                id: crypto.randomUUID(),
                key,
                value,
                description: '',
                enabled: true,
              });
            });
          } catch {
            result.url = urlStr;
          }
        }
    }
    
    i++;
  }

  // Add empty row for headers and params (for the UI)
  result.headers.push({ id: crypto.randomUUID(), key: '', value: '', description: '', enabled: true });
  result.params.push({ id: crypto.randomUUID(), key: '', value: '', description: '', enabled: true });

  return result;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (inQuote) {
      if (char === quoteChar && input[i - 1] !== '\\') {
        current += char;
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      current += char;
      inQuote = true;
      quoteChar = char;
    } else if (char === ' ' || char === '\t') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) tokens.push(current);
  return tokens;
}

function unquote(str: string): string {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}
```

#### Step 3.2: Integration — Paste Detection

In the URL bar, detect when user pastes a cURL command:

```typescript
const handlePaste = (e: React.ClipboardEvent) => {
  const text = e.clipboardData.getData('text');
  if (text.trim().startsWith('curl ')) {
    e.preventDefault();
    const parsed = parseCurl(text);
    // Populate the request builder with parsed data
    updateMethod(parsed.method);
    updateUrl(parsed.url);
    updateHeaders(parsed.headers);
    updateParams(parsed.params);
    updateBody(parsed.body);
    updateAuth(parsed.auth);
    
    toast.success('cURL command imported successfully');
  }
};
```

---

## 4. cURL Export (Generator)

### What We're Building
Generate a cURL command from the current request configuration. Copy to clipboard with one click.

### Step-by-Step

Create `apps/web/src/utils/curl-generator.ts`:
```typescript
export function generateCurl(request: {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  params: Array<{ key: string; value: string; enabled: boolean }>;
  body: { mode: string; content: string };
  auth: { type: string; bearer?: { token: string }; basic?: { username: string; password: string }; apiKey?: { key: string; value: string; addTo: string } };
}): string {
  const parts: string[] = ['curl'];

  // Method
  if (request.method !== 'GET') {
    parts.push(`-X ${request.method}`);
  }

  // Build URL with query params
  let url = request.url;
  const enabledParams = request.params.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
    const paramStr = enabledParams.map(p => 
      `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
    ).join('&');
    url += (url.includes('?') ? '&' : '?') + paramStr;
  }
  parts.push(`'${url}'`);

  // Headers
  const enabledHeaders = request.headers.filter(h => h.enabled && h.key);
  enabledHeaders.forEach(h => {
    parts.push(`-H '${h.key}: ${h.value}'`);
  });

  // Auth
  if (request.auth.type === 'bearer' && request.auth.bearer?.token) {
    parts.push(`-H 'Authorization: Bearer ${request.auth.bearer.token}'`);
  } else if (request.auth.type === 'basic' && request.auth.basic) {
    parts.push(`-u '${request.auth.basic.username}:${request.auth.basic.password}'`);
  } else if (request.auth.type === 'apikey' && request.auth.apiKey) {
    if (request.auth.apiKey.addTo === 'header') {
      parts.push(`-H '${request.auth.apiKey.key}: ${request.auth.apiKey.value}'`);
    }
  }

  // Body
  if (request.body.mode !== 'none' && request.body.content) {
    if (request.body.mode === 'json') {
      parts.push(`-H 'Content-Type: application/json'`);
    }
    parts.push(`--data-raw '${request.body.content}'`);
  }

  return parts.join(' \\\n  ');
}
```

Add a "Copy as cURL" button in the request builder toolbar.

---

## 5. Postman Collection Import

### What We're Building
Upload a Postman Collection v2.1 JSON file → parse it → create a new collection with all folders and requests.

### Step-by-Step

#### Step 5.1: Postman Parser (Backend)

Create `apps/api/src/modules/import/parsers/postman.parser.ts`:
```typescript
interface PostmanCollection {
  info: { name: string; description?: string; schema: string };
  item: PostmanItem[];
  variable?: Array<{ key: string; value: string }>;
}

interface PostmanItem {
  name: string;
  item?: PostmanItem[];       // Folder (recursive)
  request?: PostmanRequest;   // Request
}

interface PostmanRequest {
  method: string;
  url: string | { raw: string; host: string[]; path: string[]; query?: Array<{ key: string; value: string }> };
  header?: Array<{ key: string; value: string; disabled?: boolean }>;
  body?: { mode: string; raw?: string; formdata?: any[]; urlencoded?: any[] };
  auth?: any;
}

interface ParsedCollection {
  name: string;
  description: string;
  folders: Array<{ name: string; parentPath: string }>;
  requests: Array<{
    name: string;
    folderPath: string;
    method: string;
    url: string;
    headers: Array<{ key: string; value: string; description: string; enabled: boolean }>;
    params: Array<{ key: string; value: string; description: string; enabled: boolean }>;
    body: { mode: string; content: string };
    auth: { type: string; config: any };
  }>;
}

export function parsePostmanCollection(json: PostmanCollection): ParsedCollection {
  const result: ParsedCollection = {
    name: json.info?.name || 'Imported Collection',
    description: json.info?.description || '',
    folders: [],
    requests: [],
  };

  function processItems(items: PostmanItem[], parentPath: string = '') {
    items.forEach(item => {
      if (item.item && Array.isArray(item.item)) {
        // It's a folder
        const folderPath = parentPath ? `${parentPath}/${item.name}` : item.name;
        result.folders.push({ name: item.name, parentPath });
        processItems(item.item, folderPath);
      } else if (item.request) {
        // It's a request
        const req = item.request;
        
        // Parse URL
        let url = '';
        const params: any[] = [];
        if (typeof req.url === 'string') {
          url = req.url;
        } else if (req.url) {
          url = req.url.raw || '';
          if (req.url.query) {
            req.url.query.forEach(q => {
              params.push({
                key: q.key,
                value: q.value || '',
                description: '',
                enabled: true,
              });
            });
          }
        }

        // Parse headers
        const headers = (req.header || []).map(h => ({
          key: h.key,
          value: h.value || '',
          description: '',
          enabled: !h.disabled,
        }));

        // Parse body
        let body = { mode: 'none', content: '' };
        if (req.body) {
          if (req.body.mode === 'raw' && req.body.raw) {
            body = { mode: 'json', content: req.body.raw };
            try {
              JSON.parse(req.body.raw);
            } catch {
              body.mode = 'raw';
            }
          }
        }

        result.requests.push({
          name: item.name,
          folderPath: parentPath,
          method: req.method || 'GET',
          url,
          headers,
          params,
          body,
          auth: { type: 'none', config: {} },
        });
      }
    });
  }

  processItems(json.item || []);
  return result;
}
```

#### Step 5.2: Import Controller

Create `apps/api/src/modules/import/import.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { parsePostmanCollection } from './parsers/postman.parser';
import { Collection } from '../../models/Collection.model';
import { SavedRequest } from '../../models/Request.model';

export async function importPostman(req: Request, res: Response) {
  try {
    const { collection: postmanJson } = req.body;

    if (!postmanJson || !postmanJson.info) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FORMAT', message: 'Invalid Postman collection format' },
      });
    }

    const parsed = parsePostmanCollection(postmanJson);

    // Create collection
    const collection = await Collection.create({
      name: parsed.name,
      description: parsed.description,
      userId: (req as any).userId,
      folders: parsed.folders.map((f, i) => ({
        name: f.name,
        parentFolderId: null, // Simplified — full nesting handled later
        sortOrder: i,
      })),
    });

    // Create folder ID mapping
    const folderMap: Record<string, string> = {};
    collection.folders.forEach(f => {
      folderMap[f.name] = f._id.toString();
    });

    // Create requests
    const requests = parsed.requests.map((r, i) => ({
      name: r.name,
      collectionId: collection._id,
      folderId: r.folderPath ? folderMap[r.folderPath.split('/').pop()!] || null : null,
      userId: (req as any).userId,
      method: r.method,
      url: r.url,
      headers: r.headers,
      params: r.params,
      body: r.body,
      auth: r.auth,
      sortOrder: i,
    }));

    await SavedRequest.insertMany(requests);

    res.status(201).json({
      success: true,
      data: {
        collection: collection.toObject(),
        requestCount: requests.length,
        folderCount: parsed.folders.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'IMPORT_ERROR', message: error.message },
    });
  }
}
```

#### Step 5.3: Frontend Import Modal

Build an import modal:
1. File upload input (accept `.json`)
2. Read file as JSON
3. Preview: show collection name, request count, folder count
4. "Import" button → calls `POST /api/import/postman`
5. On success → refresh collection tree

---

## 6. Antigravity Prompts for Day 5

### Prompt 1: Backend History
```
Build the History module at apps/api/src/modules/history/:
1. History model with TTL index (90 days auto-delete) and text index for URL search
2. HistoryService: create (auto-truncate large bodies), list (paginated, filterable by method/status/search), getById, delete, clearAll
3. Controller and routes: GET/DELETE /api/history, GET/DELETE /api/history/:id
4. Auto-save in executor controller: save to history after every execution (fire-and-forget)

Group entries by date in the list response (Today, Yesterday, Last 7 Days, Older).
All routes protected with authenticate middleware.
```

### Prompt 2: cURL Import/Export
```
Build cURL import and export utilities:

1. apps/web/src/utils/curl-parser.ts:
   - Parse cURL command string into request config
   - Handle: -X method, -H headers, -d body, -u auth, URL with query params
   - Detect Authorization header → set auth type
   - Auto-detect JSON body mode
   - Handle line continuations (backslash + newline)
   - Return: { method, url, headers[], params[], body, auth }

2. apps/web/src/utils/curl-generator.ts:
   - Generate cURL command from request config
   - Handle: method, URL with params, headers, auth (bearer/basic/apikey), body
   - Format with line continuations for readability

3. Integration:
   - Detect cURL paste in URL bar → auto-import
   - "Copy as cURL" button → copy to clipboard
```

### Prompt 3: Postman Import
```
Build Postman Collection import at apps/api/src/modules/import/:
1. postman.parser.ts: Parse Postman Collection v2.1 JSON format
   - Handle nested folders recursively
   - Parse URL (string and object formats)
   - Parse headers, query params, body (raw/json)
   - Return: { name, folders[], requests[] }

2. import.controller.ts: POST /api/import/postman
   - Accept { collection: postmanJson }
   - Parse using postman.parser
   - Create Collection document with folders
   - Create SavedRequest documents for all requests
   - Return collection + counts

3. Frontend ImportModal.tsx:
   - File upload (accept .json)
   - Read file → preview (name, request count, folder count)
   - Import button → POST to API → refresh collection tree
```

---

*End of Day 5 Guide. Next: Open Day 6 Guide for AI Features.*
