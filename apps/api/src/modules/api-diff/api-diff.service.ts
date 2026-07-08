import { dbProvider } from '../../data/database-provider';
import { normalizeEndpointKey } from '../anomaly-detection/anomaly-detection.service';
import { DiffAnalyzerService } from '../ai/features/diff-analyzer.service';
import type { StructuralChange, DiffAnalyzerInput } from '../ai/prompts/diff-analyzer.prompt';
import type { DiffAnalysis } from '../ai/features/diff-analyzer.service';

const MAX_ENDPOINTS = 30;
const MAX_DEPTH = 5;
const SIZE_CHANGE_THRESHOLD = 0.5; // 50% size change = noteworthy

const diffAnalyzer = new DiffAnalyzerService();

// ===== Types =====

export interface HistorySnapshot {
  endpointKey: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  size: number;
  capturedAt: string;
}

export interface ApiDiffResult extends DiffAnalysis {
  structuralChanges: StructuralChange[];
  endpointsCompared: number;
  baselineDate: string;
  currentDate: string;
  availableDates: string[];
}

// ===== Service =====

/**
 * ApiDiffService — loads two historical snapshots (by date) for a collection,
 * runs a deterministic structural diff (no AI), then passes change descriptors
 * to DiffAnalyzerService for AI categorization.
 *
 * AI never sees raw response bodies — only field names, types, and change types.
 */
export class ApiDiffService {
  /**
   * Get available snapshot dates for a collection (ISO date strings with data).
   */
  async getAvailableDates(userId: string, collectionId: string): Promise<string[]> {
    const allHistory = await dbProvider.history.search({ userId, limit: 5000, offset: 0 });
    const collectionHistory = allHistory.filter(
      (h) => (h as { collectionId?: string }).collectionId === collectionId,
    );

    const dates = new Set<string>();
    for (const h of collectionHistory) {
      const at = h.executedAt as string | undefined;
      if (at) {
        dates.add(at.split('T')[0]!); // ISO date only (YYYY-MM-DD)
      }
    }
    return [...dates].sort();
  }

  /**
   * Main entry point — diff two snapshots and return AI-categorized results.
   */
  async analyze(
    userId: string,
    collectionId: string,
    baselineDate: string,
    currentDate: string,
  ): Promise<ApiDiffResult> {
    const allHistory = await dbProvider.history.search({ userId, limit: 5000, offset: 0 });
    const collectionHistory = (allHistory as Array<{
      collectionId?: string;
      executedAt?: string;
      request?: { method?: string; url?: string };
      response?: { status?: number; headers?: Record<string, string>; body?: unknown; size?: number };
    }>).filter((h) => h.collectionId === collectionId);

    if (collectionHistory.length === 0) {
      throw new Error('No history found for this collection. Run some requests first.');
    }

    // Build per-endpoint snapshots for each date window
    const baseline = this.buildSnapshots(collectionHistory, baselineDate, 'start');
    const current = this.buildSnapshots(collectionHistory, currentDate, 'end');

    // Gather available dates for the UI
    const availableDates = new Set<string>();
    for (const h of collectionHistory) {
      if (h.executedAt) availableDates.add(h.executedAt.split('T')[0]!);
    }

    // Determine all endpoint keys to compare
    const allKeys = new Set([...baseline.keys(), ...current.keys()]);
    const limitedKeys = [...allKeys].slice(0, MAX_ENDPOINTS);

    // Run deterministic structural diff
    const changes: StructuralChange[] = [];

    for (const key of limitedKeys) {
      const base = baseline.get(key);
      const curr = current.get(key);

      if (!base && curr) {
        changes.push({ endpoint: key, changeType: 'endpoint_added' });
        continue;
      }
      if (base && !curr) {
        changes.push({ endpoint: key, changeType: 'endpoint_removed' });
        continue;
      }
      if (!base || !curr) continue;

      // Status code
      if (base.status !== curr.status) {
        changes.push({
          endpoint: key,
          changeType: 'status_changed',
          oldValue: String(base.status),
          newValue: String(curr.status),
        });
      }

      // Header diff
      const headerChanges = this.diffHeaders(key, base.headers, curr.headers);
      changes.push(...headerChanges);

      // Size change
      if (base.size > 0 && curr.size > 0) {
        const ratio = Math.abs(curr.size - base.size) / base.size;
        if (ratio >= SIZE_CHANGE_THRESHOLD) {
          changes.push({
            endpoint: key,
            changeType: 'size_changed',
            oldValue: `${(base.size / 1024).toFixed(1)}KB`,
            newValue: `${(curr.size / 1024).toFixed(1)}KB`,
            detail: `${ratio >= 1 ? '+' : ''}${((curr.size / base.size - 1) * 100).toFixed(0)}% change`,
          });
        }
      }

      // Deep structural body diff
      const bodyChanges = this.diffBodies(key, base.body, curr.body);
      changes.push(...bodyChanges);
    }

    // Get collection name
    const collections = await dbProvider.collections.listByUser(userId);
    const collection = collections.find((c) => c.id === collectionId);
    const collectionName = collection?.name ?? 'API Collection';

    const input: DiffAnalyzerInput = {
      collectionName,
      baselineDate,
      currentDate,
      changes,
      endpointCount: limitedKeys.length,
    };

    const analysis = await diffAnalyzer.analyze(input);

    return {
      ...analysis,
      structuralChanges: changes,
      endpointsCompared: limitedKeys.length,
      baselineDate,
      currentDate,
      availableDates: [...availableDates].sort(),
    };
  }

  // ── Snapshot Builders ──────────────────────────────────────────────────

  /**
   * Build a map of endpointKey → HistorySnapshot for a given date.
   * mode='start': takes the first (earliest) record on that date
   * mode='end':   takes the last (latest) record on that date
   */
  private buildSnapshots(
    history: Array<{
      executedAt?: string;
      request?: { method?: string; url?: string };
      response?: { status?: number; headers?: Record<string, string>; body?: unknown; size?: number };
    }>,
    date: string,
    mode: 'start' | 'end',
  ): Map<string, HistorySnapshot> {
    const dayRecords = history.filter((h) => h.executedAt?.startsWith(date));

    // Sort by time
    dayRecords.sort((a, b) =>
      mode === 'start'
        ? (a.executedAt ?? '').localeCompare(b.executedAt ?? '')
        : (b.executedAt ?? '').localeCompare(a.executedAt ?? ''),
    );

    const map = new Map<string, HistorySnapshot>();
    for (const h of dayRecords) {
      const method = h.request?.method ?? 'GET';
      const url = h.request?.url ?? '';
      if (!url) continue;

      const key = normalizeEndpointKey(method, url);
      if (map.has(key)) continue; // Keep first match per mode

      map.set(key, {
        endpointKey: key,
        status: h.response?.status ?? 0,
        headers: h.response?.headers ?? {},
        body: h.response?.body ?? null,
        size: h.response?.size ?? 0,
        capturedAt: h.executedAt ?? date,
      });
    }
    return map;
  }

  // ── Deterministic Diff Algorithms ─────────────────────────────────────

  private diffHeaders(
    endpoint: string,
    baseHeaders: Record<string, string>,
    currHeaders: Record<string, string>,
  ): StructuralChange[] {
    const changes: StructuralChange[] = [];
    const TRACKED_HEADERS = ['content-type', 'x-deprecation', 'deprecation', 'sunset', 'cache-control', 'x-rate-limit'];

    for (const header of TRACKED_HEADERS) {
      const baseVal = baseHeaders[header] ?? baseHeaders[header.toLowerCase()];
      const currVal = currHeaders[header] ?? currHeaders[header.toLowerCase()];

      if (baseVal !== currVal) {
        changes.push({
          endpoint,
          changeType: 'header_changed',
          path: header,
          oldValue: baseVal ?? '(absent)',
          newValue: currVal ?? '(absent)',
        });
      }
    }
    return changes;
  }

  private diffBodies(endpoint: string, baseBody: unknown, currBody: unknown): StructuralChange[] {
    const changes: StructuralChange[] = [];
    const baseSchema = this.extractSchema(baseBody, '', 0);
    const currSchema = this.extractSchema(currBody, '', 0);

    // Fields removed
    for (const [path, type] of baseSchema.entries()) {
      if (!currSchema.has(path)) {
        changes.push({
          endpoint,
          changeType: 'field_removed',
          path,
          oldValue: type,
        });
      } else if (currSchema.get(path) !== type) {
        changes.push({
          endpoint,
          changeType: 'type_changed',
          path,
          oldValue: type,
          newValue: currSchema.get(path),
        });
      }
    }

    // Fields added
    for (const [path, type] of currSchema.entries()) {
      if (!baseSchema.has(path)) {
        changes.push({
          endpoint,
          changeType: 'field_added',
          path,
          newValue: type,
        });
      }
    }

    return changes;
  }

  /**
   * Extract a flat Map<dotPath, type> from a JSON object, up to MAX_DEPTH levels.
   * Arrays: uses [*] notation and samples the first element.
   */
  private extractSchema(obj: unknown, prefix: string, depth: number): Map<string, string> {
    const result = new Map<string, string>();
    if (depth >= MAX_DEPTH || obj === null || obj === undefined) return result;

    if (Array.isArray(obj)) {
      const sample = obj[0];
      if (sample && typeof sample === 'object') {
        const nested = this.extractSchema(sample, `${prefix}[*]`, depth + 1);
        for (const [p, t] of nested) result.set(p, t);
      } else {
        result.set(prefix || '[*]', `array<${this.getType(sample)}>`);
      }
      return result;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${key}` : key;
        result.set(path, this.getType(value));

        if (value && typeof value === 'object') {
          const nested = this.extractSchema(value, path, depth + 1);
          for (const [p, t] of nested) result.set(p, t);
        }
      }
      return result;
    }

    if (prefix) result.set(prefix, this.getType(obj));
    return result;
  }

  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}
