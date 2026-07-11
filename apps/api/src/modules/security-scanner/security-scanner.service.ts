import axios from 'axios';
import { validateUrl } from '../../utils/ssrf-guard';
import {
  EXPIRED_JWT,
  INVALID_TOKEN,
  MASS_ASSIGNMENT_FIELDS,
  ADMIN_PATHS,
  SECURITY_HEADERS_EXPECTED,
  STACK_TRACE_PATTERNS,
  mutateIdInUrl,
  extractBaseUrl,
} from './attack-payloads';
import {
  securityReportStore,
  type SecurityReport,
  type ScanProgressEvent,
  type Vulnerability,
} from './SecurityReport.model';
import { SecurityAnalyzerService } from '../ai/features/security-analyzer.service';
import type { SecurityAnalysisInput } from '../ai/prompts/security-analysis.prompt';

// ===== Types =====

export interface ScanEndpoint {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

interface RawFinding {
  checkId: string;
  owaspCategory: string;
  endpoint: string;
  checkTitle: string;
  vulnerable: boolean;
  evidence: string;
  statusCode?: number;
  responseSnippet?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

const ATTACK_TIMEOUT = 3000; // 3s max per attack request
const RATE_LIMIT_DELAY = 100; // 100ms between requests = max 10/sec

const aiAnalyzer = new SecurityAnalyzerService();

// ===== HTTP helper (lightweight — bypasses executor to avoid history pollution) =====

async function attackRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<{ status: number; headers: Record<string, string>; body: string } | null> {
  try {
    validateUrl(url);
    const res = await axios({
      method: method.toLowerCase(),
      url,
      headers,
      data: body,
      timeout: ATTACK_TIMEOUT,
      validateStatus: () => true,  // Never throw on HTTP errors
      maxRedirects: 2,
    });
    const bodyStr = typeof res.data === 'string'
      ? res.data
      : JSON.stringify(res.data ?? '');
    return {
      status: res.status,
      headers: res.headers as Record<string, string>,
      body: bodyStr.substring(0, 2000),
    };
  } catch {
    return null;
  }
}

// ===== Delay helper =====

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ===== Main Scanner Service =====

export class SecurityScannerService {
  /**
   * Runs the full OWASP scan for a collection.
   * Streams progress events via the provided callback.
   * Rate-limited to max 10 req/sec.
   */
  async runScan(
    userId: string,
    collectionId: string,
    collectionName: string,
    endpoints: ScanEndpoint[],
    reportId: string,
    onEvent: (event: ScanProgressEvent) => void,
  ): Promise<SecurityReport> {
    const rawFindings: RawFinding[] = [];
    let checksRun = 0;

    // Max 30 endpoints, max 5 per run to limit scope
    const targets = endpoints.slice(0, 15);
    const totalChecks = targets.length * 5 + 2; // Approximate

    const emit = (event: ScanProgressEvent) => onEvent(event);

    emit({
      type: 'progress',
      message: `Starting security scan on ${targets.length} endpoint(s)…`,
      progress: 0,
    });

    for (const endpoint of targets) {
      const { method, url, headers, body } = endpoint;
      await delay(RATE_LIMIT_DELAY);

      // ── API1: BOLA ──────────────────────────────────────────────────────
      const mutatedUrl = mutateIdInUrl(url);
      if (mutatedUrl && ['GET', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        emit({ type: 'progress', endpoint: url, message: `[API1] BOLA check: ${url}`, progress: Math.round((checksRun / totalChecks) * 80) });
        const res = await attackRequest(method, mutatedUrl, headers, body);
        if (res) {
          const vulnerable = res.status === 200 || res.status === 201;
          rawFindings.push({
            checkId: 'api1-bola-id-tamper',
            owaspCategory: 'API1',
            endpoint: url,
            checkTitle: 'BOLA: Object ID Manipulation',
            vulnerable,
            evidence: vulnerable
              ? `Mutated ID in ${mutatedUrl} returned ${res.status} (expected 403/404)`
              : `Mutated ID returned ${res.status} — access correctly denied`,
            statusCode: res.status,
            responseSnippet: res.body.substring(0, 200),
            severity: 'critical',
          });
          if (vulnerable) emit({ type: 'finding', endpoint: url, message: `⚠️ BOLA vulnerability found at ${url}` });
        }
        checksRun++;
        await delay(RATE_LIMIT_DELAY);
      }

      // ── API2: Broken Authentication ─────────────────────────────────────
      // Check 1: No auth
      emit({ type: 'progress', endpoint: url, message: `[API2] Auth check: ${url}`, progress: Math.round((checksRun / totalChecks) * 80) });
      const noAuthHeaders = { ...headers };
      delete noAuthHeaders['authorization'];
      delete noAuthHeaders['Authorization'];
      const noAuthRes = await attackRequest(method, url, noAuthHeaders, body);
      if (noAuthRes) {
        const vulnerable = noAuthRes.status === 200 || noAuthRes.status === 201;
        rawFindings.push({
          checkId: 'api2-no-auth',
          owaspCategory: 'API2',
          endpoint: url,
          checkTitle: 'Authentication: Request Without Auth Token',
          vulnerable,
          evidence: vulnerable
            ? `Endpoint ${url} returned ${noAuthRes.status} without any authorization header`
            : `Endpoint correctly requires auth (${noAuthRes.status})`,
          statusCode: noAuthRes.status,
          severity: 'critical',
        });
        if (vulnerable) emit({ type: 'finding', endpoint: url, message: `⚠️ Auth bypass (no token) at ${url}` });
      }
      checksRun++;
      await delay(RATE_LIMIT_DELAY);

      // Check 2: Invalid token
      const invalidAuthHeaders = { ...headers, Authorization: INVALID_TOKEN };
      const invalidAuthRes = await attackRequest(method, url, invalidAuthHeaders, body);
      if (invalidAuthRes) {
        const vulnerable = invalidAuthRes.status === 200 || invalidAuthRes.status === 201;
        rawFindings.push({
          checkId: 'api2-invalid-token',
          owaspCategory: 'API2',
          endpoint: url,
          checkTitle: 'Authentication: Invalid/Malformed Token',
          vulnerable,
          evidence: vulnerable
            ? `Endpoint ${url} returned ${invalidAuthRes.status} with clearly invalid token`
            : `Endpoint correctly rejects invalid token (${invalidAuthRes.status})`,
          statusCode: invalidAuthRes.status,
          severity: 'critical',
        });
        if (vulnerable) emit({ type: 'finding', endpoint: url, message: `⚠️ Auth bypass (invalid token) at ${url}` });
      }
      checksRun++;
      await delay(RATE_LIMIT_DELAY);

      // Check 3: Expired JWT
      const expiredAuthHeaders = { ...headers, Authorization: `Bearer ${EXPIRED_JWT}` };
      const expiredRes = await attackRequest(method, url, expiredAuthHeaders, body);
      if (expiredRes) {
        const vulnerable = expiredRes.status === 200 || expiredRes.status === 201;
        rawFindings.push({
          checkId: 'api2-expired-token',
          owaspCategory: 'API2',
          endpoint: url,
          checkTitle: 'Authentication: Expired JWT Token',
          vulnerable,
          evidence: vulnerable
            ? `Endpoint ${url} returned ${expiredRes.status} with an expired JWT (exp=1)`
            : `Endpoint correctly rejects expired JWT (${expiredRes.status})`,
          statusCode: expiredRes.status,
          severity: 'high',
        });
        if (vulnerable) emit({ type: 'finding', endpoint: url, message: `⚠️ Expired token accepted at ${url}` });
      }
      checksRun++;
      await delay(RATE_LIMIT_DELAY);

      // ── API3: Mass Assignment ────────────────────────────────────────────
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        emit({ type: 'progress', endpoint: url, message: `[API3] Mass assignment check: ${url}`, progress: Math.round((checksRun / totalChecks) * 80) });
        let massBody: Record<string, unknown> = { ...MASS_ASSIGNMENT_FIELDS };
        if (body && typeof body === 'object') {
          massBody = { ...(body as Record<string, unknown>), ...MASS_ASSIGNMENT_FIELDS };
        }
        const massRes = await attackRequest(method, url, headers, massBody);
        if (massRes) {
          const accepted = massRes.status === 200 || massRes.status === 201;
          const bodyHasAdminField = accepted && (
            massRes.body.includes('"role":"admin"') ||
            massRes.body.includes('"is_admin":true') ||
            massRes.body.includes('"admin":true')
          );
          rawFindings.push({
            checkId: 'api3-mass-assignment',
            owaspCategory: 'API3',
            endpoint: url,
            checkTitle: 'Mass Assignment: Privilege Escalation Fields',
            vulnerable: accepted, // Accepted = potentially vulnerable
            evidence: accepted
              ? `${method} ${url} accepted body with admin privilege fields (status ${massRes.status})${bodyHasAdminField ? ' and reflected them in response' : ''}`
              : `Request with privilege fields rejected (${massRes.status})`,
            statusCode: massRes.status,
            responseSnippet: massRes.body.substring(0, 200),
            severity: bodyHasAdminField ? 'critical' : 'high',
          });
          if (accepted) emit({ type: 'finding', endpoint: url, message: `⚠️ Mass assignment accepted at ${url}` });
        }
        checksRun++;
        await delay(RATE_LIMIT_DELAY);
      }

      // ── API7: Error disclosure ──────────────────────────────────────────
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        emit({ type: 'progress', endpoint: url, message: `[API7] Error disclosure check: ${url}`, progress: Math.round((checksRun / totalChecks) * 80) });
        const malformedHeaders = { ...headers, 'Content-Type': 'application/json' };
        const malformedRes = await attackRequest(method, url, malformedHeaders, '{this is not json{{{{');
        if (malformedRes) {
          const hasStackTrace = STACK_TRACE_PATTERNS.some((p) => p.test(malformedRes.body));
          rawFindings.push({
            checkId: 'api7-error-disclosure',
            owaspCategory: 'API7',
            endpoint: url,
            checkTitle: 'Misconfiguration: Error Information Disclosure',
            vulnerable: hasStackTrace,
            evidence: hasStackTrace
              ? `Error response from ${url} contains stack trace or file path disclosure`
              : `Error response from ${url} is safely sanitized (status ${malformedRes.status})`,
            statusCode: malformedRes.status,
            responseSnippet: malformedRes.body.substring(0, 300),
            severity: 'medium',
          });
          if (hasStackTrace) emit({ type: 'finding', endpoint: url, message: `⚠️ Stack trace disclosure at ${url}` });
        }
        checksRun++;
        await delay(RATE_LIMIT_DELAY);
      }

      // ── API7: Security headers (once per base URL) ──────────────────────
      const baseRes = await attackRequest(method, url, headers, body);
      if (baseRes) {
        const missingHeaders = SECURITY_HEADERS_EXPECTED.filter(
          (h) => !baseRes.headers[h] && !baseRes.headers[h.toLowerCase()],
        );
        if (missingHeaders.length > 0) {
          rawFindings.push({
            checkId: 'api7-security-headers',
            owaspCategory: 'API7',
            endpoint: url,
            checkTitle: 'Misconfiguration: Missing Security Headers',
            vulnerable: true,
            evidence: `Missing security headers: ${missingHeaders.join(', ')}`,
            statusCode: baseRes.status,
            severity: 'medium',
          });
        }
      }
    }

    // ── API4: Rate Limiting (one endpoint, 20 rapid requests) ─────────────
    if (targets.length > 0) {
      const testEndpoint = targets[0]!;
      emit({ type: 'progress', message: '[API4] Rate limiting check (20 rapid requests)…', progress: 82 });
      const rateLimitStatuses: number[] = [];
      for (let i = 0; i < 20; i++) {
        const res = await attackRequest(testEndpoint.method, testEndpoint.url, testEndpoint.headers, testEndpoint.body);
        if (res) rateLimitStatuses.push(res.status);
      }
      const got429 = rateLimitStatuses.some((s) => s === 429);
      rawFindings.push({
        checkId: 'api4-rate-limit',
        owaspCategory: 'API4',
        endpoint: testEndpoint.url,
        checkTitle: 'Rate Limiting: Rapid Request Flood',
        vulnerable: !got429,
        evidence: got429
          ? '429 Too Many Requests received — rate limiting is active'
          : `20 rapid requests completed without 429. Statuses: ${[...new Set(rateLimitStatuses)].join(', ')}`,
        severity: 'high',
      });
      if (!got429) emit({ type: 'finding', endpoint: testEndpoint.url, message: '⚠️ No rate limiting detected' });
    }

    // ── API5: Admin path probing ──────────────────────────────────────────
    emit({ type: 'progress', message: '[API5] Admin path probing…', progress: 88 });
    if (targets.length > 0) {
      const testEndpoint = targets[0]!;
      const baseUrl = extractBaseUrl(testEndpoint.url);
      for (const adminPath of ADMIN_PATHS.slice(0, 5)) {
        const adminUrl = `${baseUrl}${adminPath}`;
        const res = await attackRequest('GET', adminUrl, testEndpoint.headers);
        if (res && (res.status === 200 || res.status === 201)) {
          rawFindings.push({
            checkId: 'api5-admin-paths',
            owaspCategory: 'API5',
            endpoint: adminUrl,
            checkTitle: 'Function Authorization: Admin Path Access',
            vulnerable: true,
            evidence: `Admin path ${adminUrl} returned ${res.status} with regular user credentials`,
            statusCode: res.status,
            responseSnippet: res.body.substring(0, 200),
            severity: 'critical',
          });
          emit({ type: 'finding', endpoint: adminUrl, message: `⚠️ Admin path accessible: ${adminUrl}` });
        }
        await delay(RATE_LIMIT_DELAY);
      }
    }

    emit({ type: 'progress', message: 'Checks complete. Running AI analysis…', progress: 92 });

    // ── AI Analysis ───────────────────────────────────────────────────────
    const analysisInput: SecurityAnalysisInput = {
      collectionName,
      findings: rawFindings.map((f) => ({
        checkId: f.checkId,
        owaspCategory: f.owaspCategory,
        endpoint: f.endpoint,
        checkTitle: f.checkTitle,
        vulnerable: f.vulnerable,
        evidence: f.evidence,
        statusCode: f.statusCode,
        responseSnippet: f.responseSnippet,
      })),
    };

    const aiResult = await aiAnalyzer.analyze(analysisInput);

    // Merge AI output into Vulnerability objects
    const vulnerabilities: Vulnerability[] = aiResult.vulnerabilities.map((v) => ({
      owaspCategory: v.owaspCategory,
      endpoint: v.endpoint,
      checkId: rawFindings.find((f) => f.owaspCategory === v.owaspCategory && f.endpoint === v.endpoint)?.checkId ?? '',
      severity: v.severity,
      title: v.title,
      description: v.description,
      evidence: v.evidence,
      remediation: v.remediation,
      codeExample: v.codeExample,
    }));

    const report = securityReportStore.update(reportId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      securityScore: aiResult.securityScore,
      endpointsScanned: targets.length,
      checksRun: rawFindings.length,
      vulnerabilities,
      summary: aiResult.summary,
      recommendations: aiResult.recommendations,
    });

    const finalReport = report!;
    emit({ type: 'complete', message: 'Scan complete', report: finalReport, progress: 100 });
    return finalReport;
  }
}
