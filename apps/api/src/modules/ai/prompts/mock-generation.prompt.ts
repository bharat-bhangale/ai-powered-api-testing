/**
 * Mock Server Generation prompts.
 * AI analyzes a collection and generates a complete mock server configuration
 * with realistic data, stateful CRUD routes, and error templates.
 */

export const MOCK_GENERATION_SYSTEM_PROMPT = `You are an expert API mock server architect. Your job is to analyze a collection of API requests and generate a complete, stateful mock server configuration.

YOUR RESPONSIBILITIES:
1. Generate realistic mock data based on field names and types
2. Create stateful CRUD route handlers for each resource group
3. Infer resource relationships from URL patterns (/users/:id/orders)
4. Design sensible default responses for each HTTP method
5. Support pagination, filtering, and error simulation out of the box

REALISTIC DATA RULES (infer from field names):
- id, _id, uuid → generate UUID string
- name, fullName → "John Smith", "Jane Doe", "Alice Johnson" (vary these)
- firstName → "John", "Jane", "Alice"
- lastName → "Smith", "Doe", "Johnson"
- email → "john.smith@example.com" (match the name pattern)
- username → "johnsmith", "jane_doe"
- phone, phoneNumber → "+1-555-XXX-XXXX"
- address → "123 Main St, Springfield, IL 62701"
- city → "Springfield", "Chicago", "New York"
- country → "United States", "Canada", "United Kingdom"
- price, amount, cost → realistic decimal (9.99, 29.99, 149.99)
- quantity, count, stock → realistic integer (1-100)
- title → "Getting Started Guide", "Product Overview"
- description, bio, summary → "A comprehensive description of the item..."
- status → pick from: "active", "inactive", "pending", "completed"
- role → "admin", "user", "moderator"
- createdAt, updatedAt, date → ISO timestamp string
- url, imageUrl, avatarUrl → "https://example.com/image-N.jpg"
- isActive, enabled, verified → true/false (boolean)
- rating, score → 1-5 number
- category → "Electronics", "Clothing", "Books"
- tags → ["tag1", "tag2"]

ROUTE DESIGN RULES:
- GET /resource → return array from store (support ?page=N&limit=M, ?field=value filters)
- GET /resource/:id → return single item or 404
- POST /resource → create item with generated UUID, add to store, return 201
- PUT /resource/:id → replace item in store, return 200
- PATCH /resource/:id → partial update item, return 200
- DELETE /resource/:id → remove from store, return 204

RESPONSE TEMPLATES:
- All success responses include proper Content-Type: application/json
- List responses include: { data: [...], meta: { total, page, limit, totalPages } }
- Error responses: { error: { code: "NOT_FOUND", message: "..." } }
- POST/PUT include the full item in the response body

OUTPUT FORMAT: Return valid JSON matching the schema exactly. Generate 5-15 realistic seed records per resource.`;

// ===== Types for mock config =====

export interface MockRoute {
  method: string;
  path: string;            // Express path syntax e.g. /api/users/:id
  resourceKey: string;     // Key in the data store e.g. "users"
  isCollection: boolean;   // true = list endpoint, false = single-item
  hasId: boolean;          // true if path contains :id
  successStatus: number;
  responseTemplate?: Record<string, unknown>;  // For fixed (non-stateful) responses
  stateful: boolean;       // Uses in-memory data store
  paginatable: boolean;    // Supports ?page&limit
  filterableFields: string[];
}

export interface MockResource {
  key: string;             // "users", "products"
  fields: string[];        // Discovered field names
  seedData: unknown[];     // 5-15 generated records
}

export interface MockServerConfig {
  title: string;
  resources: MockResource[];
  routes: MockRoute[];
}

// ===== Prompt Builders =====

export interface CollectionEndpoint {
  name: string;
  method: string;
  url: string;
  bodyContent?: string;
  responseStatus?: number;
  responseBody?: string;
}

export function buildMockGenerationPrompt(
  collectionName: string,
  endpoints: CollectionEndpoint[],
): string {
  const endpointLines = endpoints
    .slice(0, 50)
    .map((e) => {
      let line = `${e.method} ${e.url}`;
      if (e.bodyContent) line += ` [body: ${e.bodyContent.substring(0, 200)}]`;
      if (e.responseStatus) line += ` → ${e.responseStatus}`;
      if (e.responseBody) line += ` [response: ${e.responseBody.substring(0, 300)}]`;
      return line;
    })
    .join('\n');

  return `Analyze this API collection and generate a complete mock server configuration.

Collection name: "${collectionName}"

Endpoints to mock:
${endpointLines}

Generate:
1. Identify all unique REST resources (users, products, etc.) from the URL patterns
2. For each resource, generate 8 realistic seed records using the field inference rules
3. Create route configurations for every endpoint
4. Ensure CRUD resources are stateful (POST adds, GET returns, DELETE removes from store)
5. For non-CRUD endpoints (auth/login, search, etc.) generate fixed response templates

Return JSON matching exactly this structure:
{
  "title": "Mock Server for ${collectionName}",
  "resources": [
    {
      "key": "users",
      "fields": ["id", "name", "email", "role", "createdAt"],
      "seedData": [{ "id": "uuid-1", "name": "John Smith", "email": "john@example.com", "role": "user", "createdAt": "2024-01-15T10:00:00Z" }, ...]
    }
  ],
  "routes": [
    {
      "method": "GET",
      "path": "/api/users",
      "resourceKey": "users",
      "isCollection": true,
      "hasId": false,
      "successStatus": 200,
      "stateful": true,
      "paginatable": true,
      "filterableFields": ["name", "email", "role"]
    },
    {
      "method": "POST",
      "path": "/api/users",
      "resourceKey": "users",
      "isCollection": false,
      "hasId": false,
      "successStatus": 201,
      "stateful": true,
      "paginatable": false,
      "filterableFields": []
    }
  ]
}`;
}
