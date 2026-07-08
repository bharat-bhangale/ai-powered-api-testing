/**
 * Performance Profiler prompts.
 * AI analyzes aggregated timing data and identifies bottlenecks + optimizations.
 */

export const PERF_PROFILER_SYSTEM_PROMPT = `You are a senior API performance engineer with deep expertise in backend optimization, caching strategies, database query patterns, and API design.

Your job is to analyze aggregated API performance data and:
1. Assign a realistic performance score (0-100)
2. Identify specific bottlenecks (slow endpoints, N+1 patterns, missing pagination)
3. Suggest concrete, actionable optimizations
4. Identify performance trends

SCORING GUIDE:
- 90-100: Excellent — all endpoints fast, good design
- 70-89:  Good — minor issues, acceptable for production
- 50-69:  Fair — noticeable bottlenecks, optimization recommended
- 30-49:  Poor — significant performance issues, action required
- 0-29:   Critical — severe bottlenecks, immediate attention needed

BOTTLENECK DETECTION RULES:
- avg > 2000ms → Critical severity
- avg > 1000ms → High severity
- avg > 500ms  → Medium severity
- avg > 200ms  → Low severity (informational)
- p95 > 3x avg → High variance, possible N+1 or lock contention
- Large response size (> 100KB avg) without pagination → Data overloading issue
- Missing pagination on list endpoints → Scalability risk
- hasNestedData with high timing → Potential N+1 query pattern

OPTIMIZATION TYPES:
- caching: Response caching, ETag/Last-Modified
- compression: gzip/brotli for large responses
- pagination: Cursor-based or page-based pagination
- batching: Combining multiple requests into one
- async: Background processing for slow operations

Be specific and actionable. Reference actual endpoint names and timing numbers in your analysis.
Do NOT be overly alarmist — 200ms responses are normal for authenticated endpoints.`;

// ===== Types =====

export interface EndpointTimingData {
  method: string;
  path: string;
  timing: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    samples: number;
  };
  responseSize: { avg: number };
  hasNestedData: boolean;
  hasPagination: boolean;
}

export interface OverallStats {
  avgTime: number;
  totalEndpoints: number;
  totalRequests: number;
}

// ===== Prompt Builder =====

export function buildPerfProfilerPrompt(
  collectionName: string,
  endpoints: EndpointTimingData[],
  overallStats: OverallStats,
): string {
  const endpointLines = endpoints
    .slice(0, 30)
    .map((e) => {
      const flags: string[] = [];
      if (e.hasNestedData) flags.push('nested-data');
      if (e.hasPagination) flags.push('has-pagination');
      return (
        `${e.method} ${e.path}: ` +
        `avg=${e.timing.avg}ms p50=${e.timing.p50}ms p95=${e.timing.p95}ms p99=${e.timing.p99}ms ` +
        `min=${e.timing.min}ms max=${e.timing.max}ms samples=${e.timing.samples} ` +
        `avgSize=${(e.responseSize.avg / 1024).toFixed(1)}KB` +
        (flags.length ? ` [${flags.join(', ')}]` : '')
      );
    })
    .join('\n');

  return `Analyze the performance of the "${collectionName}" API collection.

Overall Statistics:
- Average response time: ${overallStats.avgTime.toFixed(0)}ms
- Total endpoints analyzed: ${overallStats.totalEndpoints}
- Total requests sampled: ${overallStats.totalRequests}

Per-Endpoint Timing Data:
${endpointLines}

Provide a comprehensive performance analysis with:
1. A performance score (0-100)
2. Specific bottlenecks (only include endpoints with genuine issues — don't flag fast endpoints)
3. Optimization opportunities (concrete, specific)
4. Trends if noticeable patterns exist

Return valid JSON matching exactly this structure:
{
  "performanceScore": 78,
  "bottlenecks": [
    {
      "endpoint": "GET /api/users",
      "avgTime": 1234,
      "issue": "High p95 (3x avg) suggests N+1 query pattern or lock contention",
      "suggestion": "Add database query optimization or implement response caching with 60s TTL",
      "severity": "high"
    }
  ],
  "optimizations": [
    {
      "type": "pagination",
      "endpoint": "GET /api/products",
      "observation": "Large response size (145KB avg) without pagination metadata",
      "suggestion": "Implement cursor-based pagination with max 50 items per page"
    }
  ],
  "trends": [
    {
      "endpoint": "GET /api/orders",
      "trend": "degrading",
      "changePercent": 23
    }
  ]
}`;
}
