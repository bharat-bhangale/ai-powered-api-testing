import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import { APIDOC_SYSTEM_PROMPT, buildApiDocUserPrompt } from '../prompts/api-doc-generation.prompt';
import { SavedRequest, type ISavedRequest } from '../../../models/Request.model';
import { Collection } from '../../../models/Collection.model';
import { History } from '../../../models/History.model';

// ===== Zod Schema for Structured Output =====

const ParameterSchema = z.object({
  name: z.string(),
  in: z.enum(['path', 'query', 'header']),
  required: z.boolean(),
  description: z.string().optional(),
  type: z.string().describe('OpenAPI type: string, integer, number, boolean'),
  example: z.string().optional(),
});

const PropertySchema = z.object({
  name: z.string(),
  type: z.string().describe('OpenAPI type'),
  description: z.string().optional(),
  example: z.unknown().optional(),
  required: z.boolean().optional(),
});

const SchemaObjectSchema = z.object({
  name: z.string().describe('Schema/model name, e.g. "User"'),
  properties: z.array(PropertySchema),
});

const ResponseSchema = z.object({
  statusCode: z.number(),
  description: z.string(),
  schemaRef: z.string().optional().describe('Reference to a schema name in components'),
});

const EndpointDocSchema = z.object({
  path: z.string().describe('OpenAPI path, e.g. /users/{id}'),
  method: z.string().describe('HTTP method lowercase'),
  summary: z.string(),
  description: z.string(),
  tag: z.string().describe('Resource group name'),
  parameters: z.array(ParameterSchema).optional(),
  requestBodySchemaRef: z.string().optional().describe('Ref to a schema for the request body'),
  responses: z.array(ResponseSchema),
  requiresAuth: z.boolean(),
});

const SecuritySchemeSchema = z.object({
  name: z.string(),
  type: z.enum(['http', 'apiKey']),
  scheme: z.string().optional().describe('e.g. bearer'),
  in: z.string().optional().describe('e.g. header'),
  headerName: z.string().optional(),
});

const ApiDocOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  version: z.string(),
  baseUrl: z.string().optional(),
  endpoints: z.array(EndpointDocSchema),
  schemas: z.array(SchemaObjectSchema),
  securitySchemes: z.array(SecuritySchemeSchema),
  tags: z.array(z.object({ name: z.string(), description: z.string() })),
});

export type ApiDocOutput = z.infer<typeof ApiDocOutputSchema>;

// ===== Constants =====

const MAX_BODY_LENGTH = 800;

// ===== Service =====

/**
 * API Documentation Generator — AI analyzes collection requests+responses
 * and generates structured API documentation data that can be rendered
 * as OpenAPI 3.0 YAML/JSON or a visual documentation page.
 */
export class ApiDocGeneratorService {
  /**
   * Generate API documentation for a collection.
   */
  async generate(userId: string, collectionId: string): Promise<ApiDocOutput> {
    // 1. Load collection
    const collection = await Collection.findOne({ _id: collectionId, userId });
    if (!collection) throw new Error('Collection not found');

    // 2. Load all requests
    const requests = await SavedRequest.find({ collectionId, userId })
      .sort({ sortOrder: 1 })
      .lean() as unknown as ISavedRequest[];

    if (requests.length === 0) throw new Error('Collection has no requests');

    // 3. Build endpoint context with request+response data
    const endpoints = await Promise.all(
      requests.map(async (req) => {
        const entry: {
          requestName: string;
          method: string;
          url: string;
          headers?: Record<string, string>;
          bodyMode?: string;
          bodyContent?: string;
          responseStatus?: number;
          responseHeaders?: Record<string, string>;
          responseBody?: string;
        } = {
          requestName: req.name,
          method: req.method,
          url: req.url,
        };

        // Include headers (filter sensitive values)
        if (req.headers?.length > 0) {
          const headers: Record<string, string> = {};
          for (const h of req.headers) {
            if (h.key && h.enabled !== false) {
              const lowerKey = h.key.toLowerCase();
              if (lowerKey.includes('authorization') || lowerKey.includes('api-key') || lowerKey.includes('token')) {
                headers[h.key] = '***';
              } else {
                headers[h.key] = h.value || '';
              }
            }
          }
          entry.headers = headers;
        }

        // Include request body
        if (req.body?.content?.trim()) {
          entry.bodyMode = req.body.mode;
          entry.bodyContent = req.body.content.length > MAX_BODY_LENGTH
            ? req.body.content.substring(0, MAX_BODY_LENGTH) + '...'
            : req.body.content;
        }

        // Get latest history entry for response data
        try {
          const history = await History.findOne({
            userId,
            'request.method': req.method,
          })
            .sort({ executedAt: -1 })
            .lean();

          if (history?.response) {
            entry.responseStatus = history.response.status;
            if (history.response.headers) {
              entry.responseHeaders = history.response.headers as Record<string, string>;
            }
            const bodyStr = typeof history.response.body === 'string'
              ? history.response.body
              : JSON.stringify(history.response.body);
            entry.responseBody = bodyStr.length > MAX_BODY_LENGTH
              ? bodyStr.substring(0, MAX_BODY_LENGTH) + '...'
              : bodyStr;
          }
        } catch {
          // No history — skip
        }

        return entry;
      }),
    );

    // 4. Call LLM
    const result = await llmGateway.completeStructured({
      systemPrompt: APIDOC_SYSTEM_PROMPT,
      userPrompt: buildApiDocUserPrompt(collection.name, endpoints),
      responseSchema: ApiDocOutputSchema,
      schemaName: 'api_documentation',
      temperature: 0.2,
      maxTokens: 8000,
    });

    return result.parsed;
  }

  /**
   * Convert the structured doc output to OpenAPI 3.0 JSON.
   */
  toOpenApiJson(doc: ApiDocOutput): Record<string, unknown> {
    const paths: Record<string, Record<string, unknown>> = {};

    for (const ep of doc.endpoints) {
      if (!paths[ep.path]) paths[ep.path] = {};

      const operation: Record<string, unknown> = {
        summary: ep.summary,
        description: ep.description,
        tags: [ep.tag],
        responses: {},
      };

      // Parameters
      if (ep.parameters?.length) {
        operation.parameters = ep.parameters.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          description: p.description,
          schema: { type: p.type },
          ...(p.example ? { example: p.example } : {}),
        }));
      }

      // Request body
      if (ep.requestBodySchemaRef) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${ep.requestBodySchemaRef}` },
            },
          },
        };
      }

      // Responses
      const responses: Record<string, unknown> = {};
      for (const r of ep.responses) {
        const resp: Record<string, unknown> = { description: r.description };
        if (r.schemaRef) {
          resp.content = {
            'application/json': {
              schema: { $ref: `#/components/schemas/${r.schemaRef}` },
            },
          };
        }
        responses[String(r.statusCode)] = resp;
      }
      operation.responses = responses;

      // Security
      if (ep.requiresAuth && doc.securitySchemes.length > 0) {
        operation.security = [{ [doc.securitySchemes[0]!.name]: [] }];
      }

      paths[ep.path]![ep.method.toLowerCase()] = operation;
    }

    // Components schemas
    const schemas: Record<string, unknown> = {};
    for (const s of doc.schemas) {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const p of s.properties) {
        properties[p.name] = {
          type: p.type,
          ...(p.description ? { description: p.description } : {}),
          ...(p.example !== undefined ? { example: p.example } : {}),
        };
        if (p.required) required.push(p.name);
      }
      schemas[s.name] = {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }

    // Security schemes
    const securitySchemes: Record<string, unknown> = {};
    for (const ss of doc.securitySchemes) {
      if (ss.type === 'http') {
        securitySchemes[ss.name] = { type: 'http', scheme: ss.scheme || 'bearer' };
      } else {
        securitySchemes[ss.name] = {
          type: 'apiKey',
          in: ss.in || 'header',
          name: ss.headerName || ss.name,
        };
      }
    }

    return {
      openapi: '3.0.3',
      info: {
        title: doc.title,
        description: doc.description,
        version: doc.version,
      },
      ...(doc.baseUrl ? { servers: [{ url: doc.baseUrl }] } : {}),
      tags: doc.tags,
      paths,
      components: {
        schemas,
        ...(Object.keys(securitySchemes).length > 0 ? { securitySchemes } : {}),
      },
    };
  }

  /**
   * Convert to YAML string.
   */
  toYaml(openapi: Record<string, unknown>): string {
    // Simple YAML serializer for flat OpenAPI structures
    return jsonToYaml(openapi, 0);
  }
}

// ===== Helper: JSON to YAML =====

function jsonToYaml(obj: unknown, indent: number): string {
  const prefix = '  '.repeat(indent);

  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    // Quote strings that contain special chars
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#') ||
        obj.includes('{') || obj.includes('}') || obj.includes('[') ||
        obj.includes(']') || obj.includes('*') || obj.startsWith(' ') ||
        obj.startsWith('$') || obj === '') {
      return JSON.stringify(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map((item) => {
        const val = jsonToYaml(item, indent + 1);
        if (typeof item === 'object' && item !== null) {
          const lines = val.split('\n');
          return `${prefix}- ${lines[0]!.trimStart()}\n${lines.slice(1).map((l) => `${prefix}  ${l.trimStart()}`).join('\n')}`;
        }
        return `${prefix}- ${val}`;
      })
      .join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${prefix}${key}:\n${jsonToYaml(value, indent + 1)}`;
        }
        return `${prefix}${key}: ${jsonToYaml(value, indent + 1)}`;
      })
      .join('\n');
  }

  return String(obj);
}
