import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { validateUrl } from '../../utils/ssrf-guard';

// ===== Constants =====

const PROBE_TIMEOUT_MS = 5000;
const RATE_LIMIT_MS = 200; // 5 req/s = 1 per 200ms
const MAX_PROBES = 200;
const DISCOVERY_UA = 'ATX-API-Discovery/1.0';

// Paths to never probe (non-API, static assets, etc.)
const SKIP_PATH_PATTERNS = [
  /^\/(static|assets|images|img|fonts|css|js|favicon|\.well-known|robots\.txt|sitemap)/i,
  /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|gz)$/i,
];

// ===== Types =====

export interface ProbeResult {
  method: string;
  url: string;
  path: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  responseType: 'array' | 'object' | 'string' | 'empty' | 'error';
  fieldCount: number;
  timing: number;
  error?: string;
}

// ===== Service =====

/**
 * ApiDiscoveryService — executes probe requests safely.
 * - Rate limited to 5 req/s
 * - Per-probe timeout of 5s
 * - SSRF protection via validateUrl
 * - Never probes static/non-API paths
 * - Enforces max 200 probes per session
 */
export class ApiDiscoveryService {
  private probeCount = 0;
  private lastRequestTime = 0;
  private aborted = false;

  /** Reset the session state for a fresh discovery run */
  reset(): void {
    this.probeCount = 0;
    this.lastRequestTime = 0;
    this.aborted = false;
  }

  /** Signal the discovery session to stop */
  abort(): void {
    this.aborted = true;
  }

  /** Whether the discovery has been aborted */
  get isAborted(): boolean {
    return this.aborted;
  }

  /** Whether we can still probe (under limits) */
  get canProbe(): boolean {
    return !this.aborted && this.probeCount < MAX_PROBES;
  }

  /**
   * Determines if a path should be skipped (non-API path).
   */
  static shouldSkipPath(path: string): boolean {
    return SKIP_PATH_PATTERNS.some((p) => p.test(path));
  }

  /**
   * Ensures the probe target is on the same domain as the base URL.
   * Returns false if the probeUrl points to a different host.
   */
  static isSameDomain(baseUrl: string, probeUrl: string): boolean {
    try {
      const base = new URL(baseUrl);
      const probe = new URL(probeUrl);
      return base.hostname === probe.hostname;
    } catch {
      return false;
    }
  }

  /**
   * Execute a single probe request with rate limiting and timeout.
   */
  async probe(method: string, url: string): Promise<ProbeResult> {
    if (!this.canProbe) {
      throw new Error('Discovery session limit reached');
    }

    // Rate limiting — enforce minimum gap between requests
    const now = Date.now();
    const gap = now - this.lastRequestTime;
    if (gap < RATE_LIMIT_MS) {
      await sleep(RATE_LIMIT_MS - gap);
    }

    this.lastRequestTime = Date.now();
    this.probeCount++;

    const startTime = Date.now();
    const path = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return url;
      }
    })();

    try {
      // SSRF protection
      await validateUrl(url);

      const config: AxiosRequestConfig = {
        method: method.toLowerCase() as AxiosRequestConfig['method'],
        url,
        timeout: PROBE_TIMEOUT_MS,
        validateStatus: () => true,
        maxRedirects: 3,
        transformResponse: [(data: string) => data],
        headers: {
          'User-Agent': DISCOVERY_UA,
          Accept: 'application/json, */*',
        },
      };

      const response = await axios(config);
      const timing = Date.now() - startTime;

      // Parse body
      let body: unknown;
      try {
        body = JSON.parse(response.data as string);
      } catch {
        body = response.data;
      }

      const responseType = classifyBody(body);
      const fieldCount = countFields(body);

      return {
        method,
        url,
        path,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body,
        responseType,
        fieldCount,
        timing,
      };
    } catch (error: unknown) {
      const timing = Date.now() - startTime;
      const msg = error instanceof Error ? error.message : 'Probe failed';

      return {
        method,
        url,
        path,
        status: 0,
        statusText: 'Error',
        headers: {},
        body: null,
        responseType: 'error',
        fieldCount: 0,
        timing,
        error: msg,
      };
    }
  }

  /**
   * Build absolute URL from base URL and path.
   */
  static buildUrl(baseUrl: string, path: string): string {
    try {
      const base = new URL(baseUrl);
      // If path is already absolute and same-domain, use it directly
      if (path.startsWith('http')) {
        const pathUrl = new URL(path);
        if (pathUrl.hostname !== base.hostname) return '';
        return path;
      }
      // Ensure path starts with /
      const normalPath = path.startsWith('/') ? path : `/${path}`;
      return `${base.protocol}//${base.host}${normalPath}`;
    } catch {
      return '';
    }
  }
}

// ===== Helpers =====

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyBody(body: unknown): 'array' | 'object' | 'string' | 'empty' {
  if (body === null || body === undefined || body === '') return 'empty';
  if (Array.isArray(body)) return 'array';
  if (typeof body === 'object') return 'object';
  return 'string';
}

function countFields(body: unknown): number {
  if (!body || typeof body !== 'object') return 0;
  if (Array.isArray(body)) {
    const first = body[0];
    return first && typeof first === 'object' ? Object.keys(first).length : 0;
  }
  return Object.keys(body).length;
}
