import { baselineStore, type EndpointBaseline, type BaselineField } from './Baseline.model';

// ===== Constants =====

const MIN_SAMPLES = 5;
const TIMING_SIGMA = 2;    // Flag if > avg + N*stdDev
const SIZE_SIGMA = 3;       // Flag if > avg ± N*stdDev
const MAX_ANOMALIES = 10;
const FIELD_PRESENCE_THRESHOLD = 0.9;  // Fields with presence > this are "expected"
const EMA_ALPHA = 0.1;                 // Exponential moving average weight for new samples

// ===== Types =====

export type AnomalyType = 'timing' | 'size' | 'status' | 'field_missing' | 'field_new' | 'type_change';
export type AnomalySeverity = 'warning' | 'critical';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  details: {
    expected: unknown;
    actual: unknown;
  };
}

export interface AnalysisInput {
  userId: string;
  method: string;
  url: string;
  status: number;
  responseTimeMs: number;
  responseSizeBytes: number;
  responseBody: unknown;
}

export interface AnalysisResult {
  anomalies: Anomaly[];
  endpointKey: string;
  baselineActive: boolean;
  sampleCount: number;
}

// ===== Service =====

/**
 * AnomalyDetectionService — deterministic, synchronous anomaly detection.
 * Runs < 50ms. No AI calls in the hot path.
 *
 * Baseline update uses Welford's online algorithm for accurate stdDev.
 * Anomaly detection uses z-score comparison against stored baselines.
 */
export class AnomalyDetectionService {
  /**
   * Main entry point: analyze a response and update baseline.
   * Returns detected anomalies.
   */
  analyze(input: AnalysisInput): AnalysisResult {
    const endpointKey = normalizeEndpointKey(input.method, input.url);
    const baseline = baselineStore.get(input.userId, endpointKey);

    const result: AnalysisResult = {
      anomalies: [],
      endpointKey,
      baselineActive: false,
      sampleCount: baseline?.sampleCount ?? 0,
    };

    // Update baseline asynchronously (non-blocking)
    setImmediate(() => {
      this.updateBaseline(input, endpointKey, baseline);
    });

    // Don't detect until we have enough samples
    if (!baseline || baseline.sampleCount < MIN_SAMPLES) {
      return result;
    }

    result.baselineActive = true;

    const anomalies: Anomaly[] = [];

    // 1. TIMING anomaly
    const timingAnomaly = this.detectTiming(input.responseTimeMs, baseline);
    if (timingAnomaly) anomalies.push(timingAnomaly);

    // 2. SIZE anomaly
    const sizeAnomaly = this.detectSize(input.responseSizeBytes, baseline);
    if (sizeAnomaly) anomalies.push(sizeAnomaly);

    // 3. STATUS code anomaly
    const statusAnomaly = this.detectStatus(input.status, baseline);
    if (statusAnomaly) anomalies.push(statusAnomaly);

    // 4-6. Field anomalies (only for JSON responses)
    if (input.responseBody && typeof input.responseBody === 'object') {
      const fieldAnomalies = this.detectFields(input.responseBody, baseline);
      anomalies.push(...fieldAnomalies);
    }

    // Sort by severity (critical first), then cap at MAX_ANOMALIES
    anomalies.sort((a, b) => {
      if (a.severity === 'critical' && b.severity === 'warning') return -1;
      if (a.severity === 'warning' && b.severity === 'critical') return 1;
      return 0;
    });

    result.anomalies = anomalies.slice(0, MAX_ANOMALIES);
    return result;
  }

  // ── Detection Rules ───────────────────────────────────────────────────

  private detectTiming(responseTimeMs: number, baseline: EndpointBaseline): Anomaly | null {
    const { avg, stdDev } = baseline.responseTime;
    if (stdDev === 0) return null;

    const threshold = avg + TIMING_SIGMA * stdDev;
    if (responseTimeMs <= threshold) return null;

    const ratio = responseTimeMs / avg;
    return {
      type: 'timing',
      severity: ratio > 5 ? 'critical' : 'warning',
      message: `Response ${ratio.toFixed(1)}x slower than usual (${responseTimeMs}ms vs ${avg.toFixed(0)}ms avg)`,
      details: {
        expected: `≤ ${threshold.toFixed(0)}ms (avg ${avg.toFixed(0)}ms ± ${stdDev.toFixed(0)}ms)`,
        actual: `${responseTimeMs}ms`,
      },
    };
  }

  private detectSize(responseSizeBytes: number, baseline: EndpointBaseline): Anomaly | null {
    const { avg, stdDev } = baseline.responseSize;
    if (stdDev === 0 || avg === 0) return null;

    const upper = avg + SIZE_SIGMA * stdDev;
    const lower = Math.max(0, avg - SIZE_SIGMA * stdDev);

    if (responseSizeBytes >= lower && responseSizeBytes <= upper) return null;

    const isLarge = responseSizeBytes > upper;
    return {
      type: 'size',
      severity: 'warning',
      message: `Response ${isLarge ? 'unusually large' : 'unusually small'} (${formatBytes(responseSizeBytes)} vs ${formatBytes(avg)} avg)`,
      details: {
        expected: `${formatBytes(lower)} – ${formatBytes(upper)}`,
        actual: formatBytes(responseSizeBytes),
      },
    };
  }

  private detectStatus(status: number, baseline: EndpointBaseline): Anomaly | null {
    const statusKey = String(status);
    if (baseline.statusCodes[statusKey]) return null;

    const is5xx = status >= 500;
    return {
      type: 'status',
      severity: is5xx ? 'critical' : 'warning',
      message: `Unexpected status code ${status} (never seen before)`,
      details: {
        expected: `One of: ${Object.keys(baseline.statusCodes).join(', ')}`,
        actual: status,
      },
    };
  }

  private detectFields(body: unknown, baseline: EndpointBaseline): Anomaly[] {
    const anomalies: Anomaly[] = [];
    if (!baseline.fields.length) return anomalies;

    // Flatten the body to dot-notation paths
    const bodyPaths = flattenObject(body);

    // FIELD_MISSING: expected field not present
    const expectedFields = baseline.fields.filter((f) => f.presence >= FIELD_PRESENCE_THRESHOLD);
    for (const field of expectedFields.slice(0, 20)) {
      if (!bodyPaths.has(field.path)) {
        anomalies.push({
          type: 'field_missing',
          severity: 'warning',
          message: `Expected field "${field.path}" is missing from response`,
          details: {
            expected: `"${field.path}" (present in ${(field.presence * 100).toFixed(0)}% of historical responses)`,
            actual: 'absent',
          },
        });
      }
    }

    // TYPE_CHANGE: field present but wrong type
    for (const field of baseline.fields.slice(0, 20)) {
      const actualValue = bodyPaths.get(field.path);
      if (actualValue === undefined) continue;

      const actualType = getJsonType(actualValue);
      if (actualType !== field.type && field.type !== 'unknown') {
        anomalies.push({
          type: 'type_change',
          severity: 'warning',
          message: `Field "${field.path}" changed type from ${field.type} to ${actualType}`,
          details: {
            expected: field.type,
            actual: actualType,
          },
        });
      }
    }

    // FIELD_NEW: field in response not in baseline (limit to avoid noise)
    const baselinePaths = new Set(baseline.fields.map((f) => f.path));
    let newFieldCount = 0;
    for (const [p] of bodyPaths) {
      if (!baselinePaths.has(p) && newFieldCount < 3) {
        anomalies.push({
          type: 'field_new',
          severity: 'warning',
          message: `New field detected in response: "${p}"`,
          details: {
            expected: 'Field not in baseline',
            actual: p,
          },
        });
        newFieldCount++;
      }
    }

    return anomalies;
  }

  // ── Baseline Update (Welford's Online Algorithm) ──────────────────────

  private updateBaseline(
    input: AnalysisInput,
    endpointKey: string,
    existing: EndpointBaseline | undefined,
  ): void {
    const now = new Date().toISOString();

    if (!existing) {
      // First sample
      const newBaseline: EndpointBaseline = {
        userId: input.userId,
        endpointKey,
        sampleCount: 1,
        responseTime: {
          avg: input.responseTimeMs,
          stdDev: 0,
          min: input.responseTimeMs,
          max: input.responseTimeMs,
          sumOfSquares: 0,
        },
        responseSize: {
          avg: input.responseSizeBytes,
          stdDev: 0,
          sumOfSquares: 0,
        },
        statusCodes: { [String(input.status)]: 1 },
        fields: extractFields(input.responseBody),
        updatedAt: now,
      };
      baselineStore.set(newBaseline);
      return;
    }

    const n = existing.sampleCount + 1;

    // Welford's online algorithm for running mean and variance
    const timeDelta = input.responseTimeMs - existing.responseTime.avg;
    const newTimeAvg = existing.responseTime.avg + timeDelta / n;
    const newTimeSOS = existing.responseTime.sumOfSquares + timeDelta * (input.responseTimeMs - newTimeAvg);
    const newTimeStdDev = n > 1 ? Math.sqrt(newTimeSOS / (n - 1)) : 0;

    const sizeDelta = input.responseSizeBytes - existing.responseSize.avg;
    const newSizeAvg = existing.responseSize.avg + sizeDelta / n;
    const newSizeSOS = existing.responseSize.sumOfSquares + sizeDelta * (input.responseSizeBytes - newSizeAvg);
    const newSizeStdDev = n > 1 ? Math.sqrt(newSizeSOS / (n - 1)) : 0;

    // Update status codes
    const statusKey = String(input.status);
    const newStatusCodes = { ...existing.statusCodes };
    newStatusCodes[statusKey] = (newStatusCodes[statusKey] ?? 0) + 1;

    // Update fields using EMA presence + add new fields
    const newBodyFields = extractFields(input.responseBody);
    const updatedFields = mergeFields(existing.fields, newBodyFields, n, EMA_ALPHA);

    baselineStore.set({
      ...existing,
      sampleCount: n,
      responseTime: {
        avg: newTimeAvg,
        stdDev: newTimeStdDev,
        min: Math.min(existing.responseTime.min, input.responseTimeMs),
        max: Math.max(existing.responseTime.max, input.responseTimeMs),
        sumOfSquares: newTimeSOS,
      },
      responseSize: {
        avg: newSizeAvg,
        stdDev: newSizeStdDev,
        sumOfSquares: newSizeSOS,
      },
      statusCodes: newStatusCodes,
      fields: updatedFields,
      updatedAt: now,
    });
  }
}

// ===== Helpers =====

/**
 * Normalize URL to endpoint key: "GET:/api/users/123" → "GET:/api/users/:id"
 */
export function normalizeEndpointKey(method: string, url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `http://placeholder${url}`);
    const path = parsed.pathname
      // Replace UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      // Replace numeric IDs
      .replace(/\/\d+/g, '/:id');
    return `${method.toUpperCase()}:${path}`;
  } catch {
    return `${method.toUpperCase()}:${url}`;
  }
}

/** Flatten an object to dot-notation paths (max depth 4) */
function flattenObject(obj: unknown, prefix = '', depth = 0): Map<string, unknown> {
  const result = new Map<string, unknown>();
  if (depth > 4 || !obj || typeof obj !== 'object') return result;

  const o = Array.isArray(obj) ? (obj[0] ? { '[0]': obj[0] } : {}) : (obj as Record<string, unknown>);

  for (const [key, value] of Object.entries(o)) {
    const path = prefix ? `${prefix}.${key}` : key;
    result.set(path, value);
    if (value && typeof value === 'object' && depth < 4) {
      for (const [subPath, subVal] of flattenObject(value, path, depth + 1)) {
        result.set(subPath, subVal);
      }
    }
  }
  return result;
}

function extractFields(body: unknown): BaselineField[] {
  const paths = flattenObject(body);
  return Array.from(paths.entries()).slice(0, 50).map(([p, v]) => ({
    path: p,
    type: getJsonType(v),
    presence: 1,
  }));
}

function mergeFields(
  existing: BaselineField[],
  newFields: BaselineField[],
  sampleCount: number,
  alpha: number,
): BaselineField[] {
  const merged = new Map<string, BaselineField>(existing.map((f) => [f.path, { ...f }]));

  // Decay presence of existing fields not in current response
  const newPaths = new Set(newFields.map((f) => f.path));
  for (const field of merged.values()) {
    if (!newPaths.has(field.path)) {
      field.presence = field.presence * (1 - alpha); // Decay
    }
  }

  // Update or add new fields
  for (const field of newFields) {
    const existing = merged.get(field.path);
    if (existing) {
      existing.presence = existing.presence * (1 - alpha) + alpha; // EMA toward 1
    } else {
      merged.set(field.path, { ...field, presence: 1 / sampleCount }); // Low presence initially
    }
  }

  return Array.from(merged.values()).filter((f) => f.presence > 0.05).slice(0, 100);
}

function getJsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// Singleton
export const anomalyDetectionService = new AnomalyDetectionService();
