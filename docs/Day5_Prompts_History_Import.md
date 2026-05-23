# Day 5 Prompts: History, cURL Import/Export & Postman Import

## Copy-Paste Ready Prompts for Claude Opus 4.6 in Antigravity

**Day:** 5 of 7 | **Features:** 4 (History, cURL Import, cURL Export, Postman Import)  
**Prerequisites:** Day 4 working (environments, variables, auth config)

---

## Quick Reference

| # | Feature | Prompt Type | Est. Time |
|:--|:--------|:------------|:----------|
| P23 | Backend Request History | 🏗️ Backend | 20 min |
| P24 | Frontend History Panel | 🎨 Frontend | 25 min |
| P25 | cURL Import (Parser) | 🎨 Frontend | 20 min |
| P26 | cURL Export (Generator) | 🎨 Frontend | 10 min |
| P27 | Postman Collection Import | 🏗️ Backend + 🎨 Frontend | 25 min |
| P28 | Polish: Loading, Errors, Toasts | 🎨 Frontend | 15 min |

---

## ORCHESTRATOR PROMPT (Day 5)

```
Build history and import/export features for our API testing tool (Day 5).

Today's goal: Every request execution is auto-saved to history. Users can browse, search, and replay past requests. Users can import from cURL (paste) and Postman (file upload), and export current requests as cURL.

Execute in order:
1. Backend History: History model (with 90-day TTL index), auto-save in executor after every execution, paginated list with search/filter
2. Frontend History Panel: searchable list grouped by time (Today/Yesterday/Last 7 Days), click to replay, "Save to Collection" button
3. cURL Parser: client-side parser that handles -X, -H, -d, -u flags, auto-detect in URL bar on paste
4. cURL Export: generate cURL command from current request config, copy to clipboard
5. Postman Import: backend parser for v2.1 format, creates collection with folders and requests
6. Polish: loading skeletons, empty states, error toasts for all edge cases

Use Skills for architecture and patterns. History truncates response bodies >500KB.
```

---

## Individual Feature Prompts

### P23: Backend Request History

```
[BE] Build the history module at apps/api/src/modules/history/.

1. models/History.model.ts:
   - Fields: userId, request{method, url, headers, body}, response{status, statusText, headers, body, size, timing.total}, collectionId?, requestId?, environmentName?, executedAt
   - Indexes: {userId:1, executedAt:-1}, {executedAt:1} with TTL 90 days, {'request.url': 'text'}
   
2. history.service.ts:
   - create(data): truncate response.body if >500KB (store preview + truncation notice)
   - list(userId, {page, limit, method?, search?, status?}): paginated, filter by method/status range/URL search
   - getById(userId, id)
   - delete(userId, id)
   - clearAll(userId): delete all user's history

3. history.controller.ts + routes:
   - GET /api/history — list (paginated, filterable)
   - GET /api/history/:id — single entry
   - DELETE /api/history/:id — delete one
   - DELETE /api/history — clear all (with confirmation in request body)

4. Integration: update executor.controller.ts
   - After successful execution, fire-and-forget: historyService.create({...}).catch(console.error)
   - Include environmentName if environment was used
   - This should NOT slow down the response to the user

All routes protected with authenticate middleware.
```

### P24: Frontend History Panel

```
[FE] Build the history panel at apps/web/src/components/history/.

1. stores/historyStore.ts (Zustand):
   - State: entries[], isLoading, page, hasMore, search, methodFilter
   - Actions: fetchHistory(), loadMore(), setSearch(s), setMethodFilter(m), clearHistory()

2. HistoryPanel.tsx + .module.css:
   - Toggle: tab or button in sidebar to switch between Collections ↔ History views
   - Header: "History" title + search input + clear all button
   - Filter bar: method filter dropdown (All/GET/POST/PUT/DELETE)
   
3. HistoryList.tsx:
   - Group entries by time: Today, Yesterday, Last 7 Days, Older
   - Each group: collapsible header with count
   - Each entry row: method badge (colored) + URL (truncated) + status badge + timing
   - Click entry → populate request builder with request data + show response
   - "Save" button on hover → save to collection (reuse SaveModal from Day 3)

4. Visual:
   - Entries animate in with fadeInUp (staggered: 50ms delay per item)
   - Status badge colored by range (2xx green, 4xx orange, 5xx red)
   - Time shown as relative ("2 min ago", "Yesterday 3:45 PM")
   - Empty state: "No history yet. Send a request to see it here." with illustration icon
   - Infinite scroll: load more when scrolled near bottom

5. Integration:
   - Fetch history on panel open
   - Auto-refresh after each request execution (listen to requestStore.setResponse)
```

### P25: cURL Import (Parser)

```
[FE] Build cURL import at apps/web/src/utils/curl-parser.ts.

parseCurl(curlCommand: string): ParsedRequest
- Normalize: remove line continuations (\\\n), strip "curl " prefix
- Tokenize: respect single and double quotes, handle escaped quotes
- Parse flags:
  -X / --request → method (default GET, auto POST if -d present)
  -H / --header → parse "Key: Value", detect Authorization header for auth
  -d / --data / --data-raw / --data-binary → body (auto-detect JSON vs raw)
  -u / --user → basic auth (split on :)
  -L / --location → follow redirects (noted)
  URL argument → parse with URL(), extract query params separately
- Auth detection:
  "Authorization: Bearer xxx" → auth.type=bearer
  "Authorization: Basic xxx" → auth.type=basic (decode base64)
- Auto-detect JSON body (try JSON.parse → set mode=json)
- Return: {method, url, headers[], params[], body{mode, content}, auth}
- Add empty trailing row to headers[] and params[] for the editor

Integration:
- UrlBar.tsx onPaste: detect "curl " prefix → e.preventDefault() → parseCurl → populate tab
- Show toast: "cURL command imported successfully"
```

### P26: cURL Export (Generator)

```
[FE] Build cURL export at apps/web/src/utils/curl-generator.ts.

generateCurl(request): string
- Start with "curl"
- Add -X METHOD (skip for GET)
- Build URL with enabled query params appended
- Add -H 'Key: Value' for each enabled header
- Handle auth: bearer → -H 'Authorization: Bearer x', basic → -u 'user:pass', apikey header → -H
- Add body: -H 'Content-Type: application/json' for json mode, --data-raw 'content'
- Format with line continuations: " \\\n  " between parts

Integration:
- "Copy as cURL" button in request builder toolbar (or response meta area)
- Click → generate → copy to clipboard → toast "Copied to clipboard"
- Keyboard shortcut: Ctrl+Shift+C
```

### P27: Postman Collection Import

```
[BE+FE] Build Postman Collection v2.1 import.

Backend (apps/api/src/modules/import/):

1. parsers/postman.parser.ts:
   - parsePostmanCollection(json): {name, description, folders[], requests[]}
   - Handle nested item[] recursively: items with sub-items = folders, items with request = requests
   - Parse URL: string format and object format {raw, host[], path[], query[]}
   - Parse headers: [{key, value, disabled}] → [{key, value, enabled: !disabled}]
   - Parse body: raw mode → detect JSON, form-data → key-value pairs
   - Track folder path for nesting

2. import.controller.ts:
   - POST /api/import/postman (authenticate)
   - Accept {collection: postmanJson} in body
   - Parse → create Collection document with folders → create SavedRequest documents
   - Return {collection, requestCount, folderCount}

Frontend:

3. components/import/ImportModal.tsx:
   - File upload input (accept=".json")
   - On file select: read as JSON, show preview (collection name, request count, folder count)
   - "Import" button → POST /api/import/postman → refresh collection tree → close modal → toast
   - Error handling: invalid format message

4. Trigger: "Import" button in sidebar header (download icon from Lucide)
```

### P28: Polish — Loading, Errors, Toasts

```
[FE] Add loading states, empty states, and error handling across the app.

1. Loading skeletons (create Skeleton.tsx utility):
   - SkeletonLine: shimmer animated rectangle
   - SkeletonBlock: larger shimmer block
   - Apply to: response area (while loading), history list, collection tree

2. Empty states (with icons from Lucide):
   - Collections: FolderPlus icon + "No collections yet" + "Create Collection" button
   - History: Clock icon + "No history yet" + "Send a request to see it here"
   - Response area: Send icon + "Enter a URL and click Send to get started"
   - Search with no results: SearchX icon + "No results found"

3. Error toasts (using Sonner):
   - Network error: "Cannot connect to server. Check your connection."
   - Auth error: "Session expired. Please login again."
   - Validation error: show specific message from API
   - Import error: "Invalid file format" / "Import failed"
   - Success toasts: "Request saved", "Collection created", etc.

4. URL auto-prepend: if URL doesn't start with http:// or https://, prepend https://
```

---

## Sub-Agent Delegation Map (Day 5)

```
ORCHESTRATOR
├── Backend Sub-Agent:  P23 (history) → P27-backend (Postman parser)
├── Frontend Sub-Agent: P24 (history UI) → P25 (cURL import) → P26 (cURL export) → P27-frontend (import modal) → P28 (polish)
```

---

*End of Day 5 Prompts. Refer to Day5_Guide for detailed code implementations.*
