import axios from 'axios';
import { validateUrl } from '../../utils/ssrf-guard';
import {
  getPayloads,
  type FuzzCategory,
  type FuzzPayload,
} from './payload-generators';
import { FuzzAnalyzerService } from '../ai/features/fuzz-analyzer.service';

// ── Types ──────────────────────────────────────────────────────

export type FuzzVerdict = 'pass' | 'fail' | 'crash' | 'timeout' | 'leak';

export interface FuzzResult {
  id: string;
  field: string;
  category: FuzzCategory | 'ai';
  payloadLabel: string;
  payloadPreview: string;
  statusCode: number | null;
  verdict: FuzzVerdict;
  responsePreview: string;
  durationMs: number;
}

export interface FuzzReport {
  id: string;
  requestMethod: string;
  requestUrl: string;
  startedAt: string;
  completedAt?: string;
  totalPayloads: number;
  passed: number;
  failed: number;
  crashed: number;
  timedOut: number;
  leaked: number;
  results: FuzzResult[];
}

export interface FuzzProgressEvent {
  type: 'progress' | 'result' | 'complete' | 'error';
  message?: string;
  progress?: number;
  result?: FuzzResult;
  report?: FuzzReport;
}

export interface FuzzRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

// ── Constants ──────────────────────────────────────────────────

const FUZZ_TIMEOUT = 5000;   // 5s per request
const RATE_DELAY   = 200;    // 200ms = max 5 req/sec

// Stack trace patterns (reuse from security-scanner)
const TRACE_PATTERNS = [
  /at\s+\w+\s+\(/,
  /File ".*\.py"/,
  /\/var\/www\//,
  /\/home\/\w+\//,
  /node_modules\//,
  /\.rb:\d+/,
  /System\.Exception/,
];

const aiAnalyzer = new FuzzAnalyzerService();

// ── HTTP helper ────────────────────────────────────────────────

async function fuzzRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<{ status: number; body: string; ms: number } | 'timeout' | null> {
  const start = Date.now();
  try {
    validateUrl(url);
    const res = await axios({
      method: method.toLowerCase(),
      url,
      headers,
      data: body,
      timeout: FUZZ_TIMEOUT,
      validateStatus: () => true,
      maxRedirects: 0,
    });
    const bodyStr = typeof res.data === 'string'
      ? res.data
      : JSON.stringify(res.data ?? '');
    return { status: res.status, body: bodyStr.substring(0, 500), ms: Date.now() - start };
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'ECONNABORTED') return 'timeout';
    return null;
  }
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let resultCounter = 0;

function deriveVerdict(
  status: number | null,
  body: string,
  isTimeout: boolean,
): FuzzVerdict {
  if (isTimeout) return 'timeout';
  if (status === null) return 'fail';
  if (status >= 500) return 'crash';
  if (TRACE_PATTERNS.some((p) => p.test(body))) return 'leak';
  // 200/201 for clearly malicious payloads = fail (should have rejected)
  if (status === 200 || status === 201) return 'fail';
  return 'pass';
}

// ── Fuzz Service ───────────────────────────────────────────────

export class FuzzTestingService {
  async runFuzz(
    request: FuzzRequest,
    selectedCategories: FuzzCategory[],
    useAiPayloads: boolean,
    onEvent: (event: FuzzProgressEvent) => void,
  ): Promise<FuzzReport> {
    const reportId = `fuzz-${Date.now()}`;

    // 1. Build payload list
    const staticPayloads = getPayloads(selectedCategories, 200);

    // 2. Extract body fields for AI payload generation
    let aiPayloads: FuzzPayload[] = [];
    if (useAiPayloads) {
      onEvent({ type: 'progress', message: 'AI is generating contextual payloads…', progress: 2 });
      const fields = extractBodyFields(request.body);
      if (fields.length > 0) {
        aiPayloads = await aiAnalyzer.generatePayloads(fields);
      }
    }

    const allPayloads = [...staticPayloads, ...aiPayloads];
    const total = allPayloads.length;

    onEvent({ type: 'progress', message: `Running ${total} fuzz payloads…`, progress: 5 });

    const results: FuzzResult[] = [];
    let passed = 0, failed = 0, crashed = 0, timedOut = 0, leaked = 0;

    for (let i = 0; i < allPayloads.length; i++) {
      const payload = allPayloads[i]!;
      const progress = Math.round(5 + (i / total) * 90);

      // Build fuzzed body — inject payload into each body field
      const fuzzedBody = injectPayload(request.body, payload.value);

      const resp = await fuzzRequest(request.method, request.url, request.headers, fuzzedBody);

      const isTimeout = resp === 'timeout';
      const status = isTimeout || resp === null ? null : resp.status;
      const respBody = isTimeout || resp === null ? '' : resp.body;
      const ms = isTimeout || resp === null ? FUZZ_TIMEOUT : resp.ms;

      const verdict = deriveVerdict(status, respBody, isTimeout);

      // Track counters
      if (verdict === 'pass') passed++;
      else if (verdict === 'crash') crashed++;
      else if (verdict === 'timeout') timedOut++;
      else if (verdict === 'leak') leaked++;
      else failed++;

      const result: FuzzResult = {
        id: `${reportId}-${resultCounter++}`,
        field: 'body',
        category: payload.category as FuzzCategory | 'ai',
        payloadLabel: payload.label,
        payloadPreview: String(JSON.stringify(payload.value)).substring(0, 80),
        statusCode: status,
        verdict,
        responsePreview: respBody.substring(0, 200),
        durationMs: ms,
      };
      results.push(result);

      onEvent({ type: 'result', result, progress });

      await delay(RATE_DELAY);
    }

    const report: FuzzReport = {
      id: reportId,
      requestMethod: request.method,
      requestUrl: request.url,
      startedAt: new Date(Date.now() - allPayloads.length * RATE_DELAY).toISOString(),
      completedAt: new Date().toISOString(),
      totalPayloads: total,
      passed, failed, crashed, timedOut, leaked,
      results,
    };

    onEvent({ type: 'complete', report, progress: 100 });
    return report;
  }
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Extracts top-level field names from a JSON body for AI analysis.
 */
function extractBodyFields(body: unknown): Array<{ name: string; value: unknown }> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
  return Object.entries(body as Record<string, unknown>)
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
}

/**
 * Creates a copy of the body with the fuzz payload injected into each field.
 * If body is not an object, replaces it entirely.
 */
function injectPayload(body: unknown, payloadValue: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return payloadValue;
  }
  const original = body as Record<string, unknown>;
  const fuzzed: Record<string, unknown> = {};
  for (const key of Object.keys(original)) {
    fuzzed[key] = payloadValue;
  }
  return fuzzed;
}
