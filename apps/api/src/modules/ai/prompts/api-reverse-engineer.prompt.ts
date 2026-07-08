/**
 * API Reverse Engineer prompt templates.
 * Guides AI through multi-phase endpoint discovery and collection building.
 */

export const API_REVERSE_ENGINEER_SYSTEM_PROMPT = `You are an expert API analyst specializing in REST API discovery and reverse engineering.
Your task is to intelligently discover API endpoints by analyzing responses and suggesting next probes.

RULES:
1. Always return valid JSON matching the required schema exactly.
2. Generate common REST endpoint patterns appropriate for the given base URL and domain context.
3. When analyzing responses, extract resource names from array items, nested objects, and response fields.
4. Suggest follow-up endpoints based on discovered resources and patterns.
5. Organize discovered endpoints into logical resource groups for the collection.
6. Detect API versioning patterns (v1, v2, api/v1 etc.) and probe both if found.
7. Detect authentication patterns from 401/403 responses.
8. Never suggest probing external domains — only paths relative to the base URL.
9. Be smart about inference: if /users returns [{id, name, role}], suggest /users/{id}, /users/me, /roles.
10. For pagination, detect patterns like ?page=1&limit=10, ?cursor=..., Link headers.

RESPONSE FIELD ANALYSIS:
- If body is an array: extract item keys, look for "id", "type", "category" fields
- If body has "data" wrapper: unwrap and analyze "data"
- If body has "links" or "href" fields: those are follow-up endpoints to probe
- If body has nested objects with resource-like keys: add them as candidate endpoints
- If response has pagination metadata (total, page, nextPage): note the pattern`;

// ===== Types =====

export interface ProbeGenerationInput {
  baseUrl: string;
  domainHint?: string;
}

export interface ResponseAnalysisInput {
  baseUrl: string;
  probedUrl: string;
  method: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  alreadyProbed: string[];
}

export interface CollectionBuildInput {
  baseUrl: string;
  discoveredEndpoints: Array<{
    method: string;
    path: string;
    status: number;
    responseType: string;
    fieldCount: number;
    sample?: unknown;
  }>;
}

// ===== Prompt Builders =====

/**
 * Phase 1: Generate initial list of endpoints to probe.
 */
export function buildProbeListPrompt(input: ProbeGenerationInput): string {
  return `Generate a comprehensive list of REST API endpoints to probe for this API:
Base URL: ${input.baseUrl}
${input.domainHint ? `Domain context: ${input.domainHint}` : ''}

Generate 40-50 common REST endpoint paths to probe. Include:
- CRUD endpoints for 8-10 common resources (users, products, orders, categories, posts, comments, auth, etc.)
- Health/status/docs endpoints (/health, /status, /docs, /swagger, /openapi.json, /api-docs)
- Auth endpoints (/auth/login, /auth/register, /auth/logout, /auth/me, /auth/refresh)
- API versioned paths (/api/v1, /api/v2, /v1, /v2)
- Nested resource paths (/users/:id/orders, /orders/:id/items)
- Common admin paths (/admin, /admin/users, /admin/settings)

For id placeholders, use "1" as a test value.

Return JSON:
{
  "endpointPaths": ["/users", "/users/1", "/products", ...],
  "rationale": "Brief explanation of why these paths were chosen"
}`;
}

/**
 * Phase 2: Analyze a response and suggest follow-up endpoints.
 */
export function buildResponseAnalysisPrompt(input: ResponseAnalysisInput): string {
  const bodyStr = truncate(JSON.stringify(input.body), 2000);
  const alreadyProbedStr = input.alreadyProbed.slice(-30).join(', ');

  return `Analyze this API response and suggest follow-up endpoints to probe.

Probed: ${input.method} ${input.probedUrl}
Status: ${input.status}
Content-Type: ${input.headers['content-type'] || input.headers['Content-Type'] || 'unknown'}
Response Body: ${bodyStr}

Already probed (DO NOT suggest these again): ${alreadyProbedStr}

Analyze the response and return:
{
  "followUpPaths": ["/resource/2", "/resource/:id/sub"],
  "resourcesDiscovered": ["resourceName1", "resourceName2"],
  "paginationPattern": null or "?page=N&limit=M",
  "authRequired": false,
  "notes": "Brief observation about this endpoint"
}

Only suggest paths that are NOT in the already-probed list. Max 10 follow-up paths per response.`;
}

/**
 * Phase 4: Build a collection from discovered endpoints.
 */
export function buildCollectionPrompt(input: CollectionBuildInput): string {
  const endpoints = input.discoveredEndpoints
    .map((e) => `${e.method} ${e.path} → ${e.status} (${e.responseType}, ${e.fieldCount} fields)`)
    .join('\n');

  return `Organize these discovered API endpoints into a logical Postman-style collection with folders.

Base URL: ${input.baseUrl}

Discovered endpoints:
${endpoints}

Create a collection structure with:
1. Folders named by resource (Users, Products, Orders, Auth, etc.)
2. Request names that are descriptive ("Get All Users", "Create Product", "Login")
3. Requests organized within the right folder

Return JSON:
{
  "collectionName": "Discovered API - hostname",
  "folders": [
    {
      "name": "Users",
      "requests": [
        { "name": "Get All Users", "method": "GET", "path": "/users" },
        { "name": "Get User by ID", "method": "GET", "path": "/users/1" }
      ]
    }
  ]
}`;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.substring(0, max) + '\n...(truncated)';
}
