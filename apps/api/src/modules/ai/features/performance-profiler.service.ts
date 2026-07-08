import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  PERF_PROFILER_SYSTEM_PROMPT,
  buildPerfProfilerPrompt,
  type EndpointTimingData,
} from '../prompts/performance-profiler.prompt';
import { dbProvider } from '../../../data/database-provider';
import { normalizeEndpointKey } from '../../anomaly-detection/anomaly-detection.service';

// ===== Zod Schema =====

const BottleneckSchema = z.object({
  endpoint: z.string(),
  avgTime: z.number(),
  issue: z.string(),
  suggestion: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
});

const OptimizationSchema = z.object({
  type: z.enum(['caching', 'compression', 'pagination', 'batching', 'async']),
  endpoint: z.string(),
  observation: z.string(),
  suggestion: z.string(),
});

const TrendSchema = z.object({
  endpoint: z.string(),
  trend: z.enum(['improving', 'degrading', 'stable']),
  changePercent: z.number(),
});

const PerfProfileSchema = z.object({
  performanceScore: z.number().min(0).max(100),
  bottlenecks: z.array(BottleneckSchema),
  optimizations: z.array(OptimizationSchema),
  trends: z.array(TrendSchema),
});

export type PerfProfile = z.infer<typeof PerfProfileSchema>;

// ===== Constants =====

const MIN_SAMPLES_REQUIRED = 3;
const MAX_ENDPOINTS = 30;

// ===== Service =====

/**
 * PerformanceProfilerService — aggregates timing data from history,
 * computes per-endpoint statistics (avg, p50, p95, p99, min, max),
 * then sends token-efficient metadata to AI for analysis.
 *
 * No response bodies are sent to AI — only timing + structural metadata.
 */
export class PerformanceProfilerService {
  async profile(userId: string, collectionId: string): Promise<PerfProfile> {
    // 1. Load collection requests
    const requests = await dbProvider.requests.listByCollection({ collectionId, userId });
    if (requests.length === 0) throw new Error('Collection has no requests');

    // 2. Load history for all requests in this collection
    const allHistory = await dbProvider.history.search({ userId, limit: 2000, offset: 0 });

    // Filter to only history entries related to this collection
    const collectionHistory = allHistory.filter(
      (h) => (h as { collectionId?: string }).collectionId === collectionId,
    );

    if (collectionHistory.length < MIN_SAMPLES_REQUIRED) {
      throw new Error(
        `Minimum ${MIN_SAMPLES_REQUIRED} requests required before profiling is available. ` +
        `Currently have ${collectionHistory.length}.`,
      );
    }

    // 3. Group timing data by normalized endpoint key
    const endpointMap = new Map<string, number[]>();
    const endpointSizeMap = new Map<string, number[]>();
    const endpointMeta = new Map<string, { hasNestedData: boolean; hasPagination: boolean }>();

    for (const h of collectionHistory) {
      const req = h.request as { method?: string; url?: string } | undefined;
      const resp = h.response as { timing?: { total?: number }; size?: number; body?: unknown } | undefined;

      if (!req?.method || !req?.url) continue;

      const key = normalizeEndpointKey(req.method, req.url);
      const timing = resp?.timing?.total ?? 0;
      const size = resp?.size ?? 0;

      if (!endpointMap.has(key)) endpointMap.set(key, []);
      if (!endpointSizeMap.has(key)) endpointSizeMap.set(key, []);
      endpointMap.get(key)!.push(timing);
      endpointSizeMap.get(key)!.push(size);

      // Detect structural metadata from body (only once per endpoint)
      if (!endpointMeta.has(key) && resp?.body) {
        const body = resp.body as Record<string, unknown>;
        const hasNestedData = this.hasNestedArrays(body);
        const hasPagination = this.hasPaginationMeta(body);
        endpointMeta.set(key, { hasNestedData, hasPagination });
      }
    }

    // 4. Compute per-endpoint statistics
    const endpoints: EndpointTimingData[] = [];
    let totalTime = 0;
    let totalRequests = 0;

    for (const [key, timings] of endpointMap.entries()) {
      if (timings.length === 0) continue;

      const sorted = [...timings].sort((a, b) => a - b);
      const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? avg;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? avg;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? avg;
      const min = sorted[0] ?? 0;
      const max = sorted[sorted.length - 1] ?? 0;

      const sizes = endpointSizeMap.get(key) ?? [];
      const avgSize = sizes.length > 0 ? sizes.reduce((s, v) => s + v, 0) / sizes.length : 0;

      const [method, ...pathParts] = key.split(':');
      const path = pathParts.join(':');

      endpoints.push({
        method: method ?? 'GET',
        path: path ?? '/',
        timing: { avg, p50, p95, p99, min, max, samples: sorted.length },
        responseSize: { avg: avgSize },
        ...(endpointMeta.get(key) ?? { hasNestedData: false, hasPagination: false }),
      });

      totalTime += avg;
      totalRequests += sorted.length;
    }

    // Sort by avg time descending (worst first) and cap at 30
    endpoints.sort((a, b) => b.timing.avg - a.timing.avg);
    const topEndpoints = endpoints.slice(0, MAX_ENDPOINTS);

    const overallStats = {
      avgTime: endpoints.length > 0 ? totalTime / endpoints.length : 0,
      totalEndpoints: endpoints.length,
      totalRequests,
    };

    // Get collection name
    const collections = await dbProvider.collections.listByUser(userId);
    const collection = collections.find((c) => c.id === collectionId);
    const collectionName = collection?.name ?? 'API Collection';

    // 5. Send to AI
    const result = await llmGateway.completeStructured({
      systemPrompt: PERF_PROFILER_SYSTEM_PROMPT,
      userPrompt: buildPerfProfilerPrompt(collectionName, topEndpoints, overallStats),
      responseSchema: PerfProfileSchema,
      schemaName: 'perf_profile',
      temperature: 0.2,
      maxTokens: 4000,
    });

    return result.parsed;
  }

  private hasNestedArrays(body: unknown): boolean {
    if (!body || typeof body !== 'object') return false;
    const values = Object.values(body as Record<string, unknown>);
    return values.some((v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object');
  }

  private hasPaginationMeta(body: unknown): boolean {
    if (!body || typeof body !== 'object') return false;
    const keys = Object.keys(body as Record<string, unknown>).map((k) => k.toLowerCase());
    return (
      keys.includes('page') ||
      keys.includes('total') ||
      keys.includes('totalpages') ||
      keys.includes('meta') ||
      keys.includes('cursor') ||
      keys.includes('nextcursor')
    );
  }
}
