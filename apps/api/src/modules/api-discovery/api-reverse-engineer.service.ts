import { z } from 'zod';
import { llmGateway } from '../ai/llm-gateway';
import {
  API_REVERSE_ENGINEER_SYSTEM_PROMPT,
  buildProbeListPrompt,
  buildResponseAnalysisPrompt,
  buildCollectionPrompt,
} from '../ai/prompts/api-reverse-engineer.prompt';
import { ApiDiscoveryService } from './api-discovery.service';
import type { ProbeResult } from './api-discovery.service';

// ===== Zod Schemas =====

const ProbeListSchema = z.object({
  endpointPaths: z.array(z.string()).describe('List of paths to probe'),
  rationale: z.string().describe('Why these paths were chosen'),
});

const ResponseAnalysisSchema = z.object({
  followUpPaths: z.array(z.string()).describe('Suggested follow-up paths to probe'),
  resourcesDiscovered: z.array(z.string()).describe('Resource names found in the response'),
  paginationPattern: z.string().nullable().describe('Pagination query pattern if detected'),
  authRequired: z.boolean().describe('Whether auth appears to be required'),
  notes: z.string().describe('Brief observations about this endpoint'),
});

const CollectionFolderSchema = z.object({
  name: z.string(),
  requests: z.array(z.object({
    name: z.string(),
    method: z.string(),
    path: z.string(),
  })),
});

const CollectionSchema = z.object({
  collectionName: z.string(),
  folders: z.array(CollectionFolderSchema),
});

// ===== SSE Event Types =====

export type DiscoveryEvent =
  | { type: 'phase'; data: { phase: number; description: string } }
  | { type: 'probing'; data: { url: string; method: string } }
  | { type: 'discovered'; data: { method: string; path: string; status: number; responseType: string; fieldCount: number } }
  | { type: 'skipped'; data: { url: string; reason: string } }
  | { type: 'error'; data: { url: string; error: string } }
  | { type: 'complete'; data: { totalEndpoints: number; collection: CollectionResult } }
  | { type: 'stopped'; data: { totalEndpoints: number } }
  | { type: 'auth_required'; data: { message: string } };

export interface CollectionResult {
  collectionName: string;
  folders: Array<{
    name: string;
    requests: Array<{ name: string; method: string; path: string; url: string }>;
  }>;
}

// ===== Orchestrator =====

/**
 * ApiReverseEngineerService — multi-phase discovery orchestrator.
 *
 * Phase 1: AI generates a probe list from the base URL
 * Phase 2: Execute probes; AI analyzes successful responses for follow-ups
 * Phase 3: Probe additional HTTP methods (POST, DELETE) on discovered GETs
 * Phase 4: AI builds a structured collection from all discovered endpoints
 *
 * All progress is streamed via the provided emitter callback.
 */
export class ApiReverseEngineerService {
  private discoveryService = new ApiDiscoveryService();
  private discovered: ProbeResult[] = [];
  private probed = new Set<string>();

  /** Stop the current discovery session */
  stop(): void {
    this.discoveryService.abort();
  }

  /**
   * Main discovery entry point. Emits SSE events via the callback.
   */
  async discover(
    baseUrl: string,
    emit: (event: DiscoveryEvent) => void,
  ): Promise<void> {
    this.discoveryService.reset();
    this.discovered = [];
    this.probed = new Set();

    const normalizedBase = normalizeBaseUrl(baseUrl);

    // ─────────────────────────────────────────────
    // PHASE 1: AI generates initial probe list
    // ─────────────────────────────────────────────
    emit({ type: 'phase', data: { phase: 1, description: 'Generating probe list with AI...' } });

    let initialPaths: string[] = [];
    try {
      const result = await llmGateway.completeStructured({
        systemPrompt: API_REVERSE_ENGINEER_SYSTEM_PROMPT,
        userPrompt: buildProbeListPrompt({ baseUrl: normalizedBase }),
        responseSchema: ProbeListSchema,
        schemaName: 'probe_list',
        temperature: 0.3,
        maxTokens: 2000,
      });
      initialPaths = result.parsed.endpointPaths;
    } catch {
      // Fallback to a hardcoded sensible default list
      initialPaths = DEFAULT_PROBE_PATHS;
    }

    // ─────────────────────────────────────────────
    // PHASE 2: Execute probes + response-driven discovery
    // ─────────────────────────────────────────────
    emit({ type: 'phase', data: { phase: 2, description: 'Probing endpoints and analyzing responses...' } });

    const probingQueue = [...initialPaths];

    while (probingQueue.length > 0 && this.discoveryService.canProbe) {
      const path = probingQueue.shift()!;

      // Skip if already probed
      const key = `GET:${path}`;
      if (this.probed.has(key)) continue;
      this.probed.add(key);

      // Skip non-API paths
      if (ApiDiscoveryService.shouldSkipPath(path)) {
        emit({ type: 'skipped', data: { url: path, reason: 'Non-API path' } });
        continue;
      }

      const url = ApiDiscoveryService.buildUrl(normalizedBase, path);
      if (!url) continue;

      // Check same domain
      if (!ApiDiscoveryService.isSameDomain(normalizedBase, url)) {
        emit({ type: 'skipped', data: { url, reason: 'External domain' } });
        continue;
      }

      emit({ type: 'probing', data: { url, method: 'GET' } });

      const result = await this.discoveryService.probe('GET', url);

      if (result.error && result.status === 0) {
        emit({ type: 'error', data: { url, error: result.error } });
        continue;
      }

      // Record as discovered if it returned something useful
      if (result.status >= 200 && result.status < 500) {
        if (result.status >= 200 && result.status < 300) {
          this.discovered.push(result);
          emit({
            type: 'discovered',
            data: {
              method: 'GET',
              path: result.path,
              status: result.status,
              responseType: result.responseType,
              fieldCount: result.fieldCount,
            },
          });

          // AI analyzes response for follow-up paths (only on 2xx)
          if (result.responseType !== 'error' && result.responseType !== 'empty') {
            try {
              const analysis = await llmGateway.completeStructured({
                systemPrompt: API_REVERSE_ENGINEER_SYSTEM_PROMPT,
                userPrompt: buildResponseAnalysisPrompt({
                  baseUrl: normalizedBase,
                  probedUrl: url,
                  method: 'GET',
                  status: result.status,
                  headers: result.headers,
                  body: result.body,
                  alreadyProbed: Array.from(this.probed),
                }),
                responseSchema: ResponseAnalysisSchema,
                schemaName: 'response_analysis',
                temperature: 0.2,
                maxTokens: 1000,
              });

              if (analysis.parsed.authRequired) {
                emit({ type: 'auth_required', data: { message: 'API requires authentication — some endpoints may need credentials' } });
              }

              // Add follow-up paths to the queue
              for (const followPath of analysis.parsed.followUpPaths) {
                const followKey = `GET:${followPath}`;
                if (!this.probed.has(followKey)) {
                  probingQueue.push(followPath);
                }
              }
            } catch {
              // Non-fatal: skip AI analysis for this response
            }
          }
        }
      }

      if (this.discoveryService.isAborted) break;
    }

    if (this.discoveryService.isAborted) {
      emit({ type: 'stopped', data: { totalEndpoints: this.discovered.length } });
      return;
    }

    // ─────────────────────────────────────────────
    // PHASE 3: Method discovery on found GETs
    // ─────────────────────────────────────────────
    emit({ type: 'phase', data: { phase: 3, description: 'Probing additional HTTP methods...' } });

    const methodsToTry = ['POST', 'PUT', 'DELETE', 'PATCH'] as const;
    // Only probe methods on the first 15 discovered endpoints (to stay under limits)
    const endpointsForMethodProbe = this.discovered.slice(0, 15);

    for (const endpoint of endpointsForMethodProbe) {
      if (!this.discoveryService.canProbe) break;
      if (this.discoveryService.isAborted) break;

      for (const method of methodsToTry) {
        if (!this.discoveryService.canProbe) break;

        const key = `${method}:${endpoint.path}`;
        if (this.probed.has(key)) continue;
        this.probed.add(key);

        emit({ type: 'probing', data: { url: endpoint.url, method } });

        const result = await this.discoveryService.probe(method, endpoint.url);

        // 405 with Allow header tells us what methods ARE supported
        if (result.status === 405) {
          const allowed = result.headers['allow'] || result.headers['Allow'] || '';
          if (allowed) {
            // Parse the Allow header and record those methods
            const allowedMethods = allowed.split(',').map((m) => m.trim());
            for (const m of allowedMethods) {
              if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) {
                const existingKey = `${m}:${endpoint.path}`;
                if (!this.probed.has(existingKey) && m !== 'GET') {
                  this.probed.add(existingKey);
                  // Record as a synthetic discovered endpoint
                  this.discovered.push({
                    ...endpoint,
                    method: m,
                    body: null,
                    responseType: 'empty',
                    fieldCount: 0,
                  });
                  emit({
                    type: 'discovered',
                    data: { method: m, path: endpoint.path, status: 200, responseType: 'empty', fieldCount: 0 },
                  });
                }
              }
            }
          }
          continue;
        }

        // Record non-error, non-redirect responses
        if (result.status >= 200 && result.status < 300) {
          this.discovered.push(result);
          emit({
            type: 'discovered',
            data: {
              method,
              path: result.path,
              status: result.status,
              responseType: result.responseType,
              fieldCount: result.fieldCount,
            },
          });
        }
      }
    }

    if (this.discoveryService.isAborted) {
      emit({ type: 'stopped', data: { totalEndpoints: this.discovered.length } });
      return;
    }

    // ─────────────────────────────────────────────
    // PHASE 4: Build collection with AI
    // ─────────────────────────────────────────────
    emit({ type: 'phase', data: { phase: 4, description: 'Organizing collection with AI...' } });

    let collection: CollectionResult;
    try {
      const collectionData = await llmGateway.completeStructured({
        systemPrompt: API_REVERSE_ENGINEER_SYSTEM_PROMPT,
        userPrompt: buildCollectionPrompt({
          baseUrl: normalizedBase,
          discoveredEndpoints: this.discovered.map((e) => ({
            method: e.method,
            path: e.path,
            status: e.status,
            responseType: e.responseType,
            fieldCount: e.fieldCount,
          })),
        }),
        responseSchema: CollectionSchema,
        schemaName: 'api_collection',
        temperature: 0.2,
        maxTokens: 2000,
      });

      // Attach full URLs to each request
      collection = {
        collectionName: collectionData.parsed.collectionName,
        folders: collectionData.parsed.folders.map((folder) => ({
          ...folder,
          requests: folder.requests.map((req) => ({
            ...req,
            url: ApiDiscoveryService.buildUrl(normalizedBase, req.path),
          })),
        })),
      };
    } catch {
      // Fallback: simple flat collection
      collection = buildFallbackCollection(normalizedBase, this.discovered);
    }

    emit({
      type: 'complete',
      data: { totalEndpoints: this.discovered.length, collection },
    });
  }
}

// ===== Helpers =====

function normalizeBaseUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function buildFallbackCollection(baseUrl: string, discovered: ProbeResult[]): CollectionResult {
  const hostname = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return 'API';
    }
  })();

  return {
    collectionName: `Discovered API - ${hostname}`,
    folders: [
      {
        name: 'Discovered Endpoints',
        requests: discovered.map((e) => ({
          name: `${e.method} ${e.path}`,
          method: e.method,
          path: e.path,
          url: e.url,
        })),
      },
    ],
  };
}

// Default probe paths used as fallback if AI generation fails
const DEFAULT_PROBE_PATHS = [
  '/health', '/status', '/ping',
  '/api', '/api/v1', '/api/v2', '/v1', '/v2',
  '/docs', '/swagger', '/openapi.json', '/api-docs',
  '/users', '/users/1', '/users/me',
  '/products', '/products/1',
  '/orders', '/orders/1',
  '/categories', '/categories/1',
  '/posts', '/posts/1',
  '/comments', '/comments/1',
  '/auth/login', '/auth/register', '/auth/me', '/auth/logout', '/auth/refresh',
  '/auth', '/login', '/register',
  '/profile', '/settings', '/config',
  '/items', '/items/1',
  '/customers', '/customers/1',
  '/inventory', '/cart',
  '/notifications', '/messages',
  '/tags', '/roles', '/permissions',
  '/search', '/filter',
  '/admin', '/admin/users', '/admin/settings',
];
