/**
 * attack-payloads.ts
 * Pre-built attack payload library for OWASP API Security Top 10.
 * Each category includes the check type, description, and payload templates.
 */

export type OwaspCategory = 'API1' | 'API2' | 'API3' | 'API4' | 'API5' | 'API7';

export interface AttackCheck {
  id: string;
  owaspCategory: OwaspCategory;
  title: string;
  description: string;
  /** Expected safe status codes — anything outside is a finding */
  safeStatuses: number[];
  /** What triggers a VULNERABLE vs WARNING finding */
  vulnStatuses: number[];
}

// ===== OWASP Checks Catalogue =====

export const OWASP_CHECKS: AttackCheck[] = [
  // API1 — Broken Object Level Authorization (BOLA / IDOR)
  {
    id: 'api1-bola-id-tamper',
    owaspCategory: 'API1',
    title: 'BOLA: Object ID Manipulation',
    description: 'Checks if changing a numeric/UUID object ID returns data that should belong to another user.',
    safeStatuses: [403, 404, 401],
    vulnStatuses: [200, 201],
  },

  // API2 — Broken Authentication
  {
    id: 'api2-no-auth',
    owaspCategory: 'API2',
    title: 'Authentication: Request Without Auth Token',
    description: 'Sends request with no Authorization header. Should return 401.',
    safeStatuses: [401, 403],
    vulnStatuses: [200, 201],
  },
  {
    id: 'api2-invalid-token',
    owaspCategory: 'API2',
    title: 'Authentication: Invalid/Malformed Token',
    description: 'Sends request with a clearly invalid auth token. Should return 401.',
    safeStatuses: [401, 403],
    vulnStatuses: [200, 201],
  },
  {
    id: 'api2-expired-token',
    owaspCategory: 'API2',
    title: 'Authentication: Expired JWT Token',
    description: 'Sends request with an expired JWT. Should return 401.',
    safeStatuses: [401, 403],
    vulnStatuses: [200, 201],
  },

  // API3 — Broken Object Property Level Authorization (Mass Assignment)
  {
    id: 'api3-mass-assignment',
    owaspCategory: 'API3',
    title: 'Mass Assignment: Privilege Escalation Fields',
    description: 'Adds admin/privilege fields to POST/PUT body. If accepted, indicates mass assignment vulnerability.',
    safeStatuses: [400, 403, 422],
    vulnStatuses: [200, 201],
  },

  // API4 — Unrestricted Resource Consumption (Rate Limiting)
  {
    id: 'api4-rate-limit',
    owaspCategory: 'API4',
    title: 'Rate Limiting: Rapid Request Flood',
    description: 'Sends 20 rapid requests to check for rate limiting. Absence of 429 indicates missing rate limiting.',
    safeStatuses: [429],
    vulnStatuses: [200, 201],
  },

  // API5 — Broken Function Level Authorization (Admin Path Probing)
  {
    id: 'api5-admin-paths',
    owaspCategory: 'API5',
    title: 'Function Authorization: Admin Path Access',
    description: 'Probes common admin paths with regular-user credentials.',
    safeStatuses: [401, 403, 404],
    vulnStatuses: [200, 201],
  },

  // API7 — Security Misconfiguration
  {
    id: 'api7-error-disclosure',
    owaspCategory: 'API7',
    title: 'Misconfiguration: Error Information Disclosure',
    description: 'Sends malformed request and checks if error response contains stack traces or file paths.',
    safeStatuses: [400, 422, 500],
    vulnStatuses: [], // Checked by content analysis, not status codes
  },
  {
    id: 'api7-security-headers',
    owaspCategory: 'API7',
    title: 'Misconfiguration: Missing Security Headers',
    description: 'Checks for absence of important security headers in responses.',
    safeStatuses: [],
    vulnStatuses: [], // Checked by header analysis
  },
];

// ===== Payload Templates =====

/** An expired JWT (well-formed but exp=0) — will fail signature validation */
export const EXPIRED_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** Clearly invalid token */
export const INVALID_TOKEN = 'Bearer invalid.token.here.abc123xyz';

/** Mass assignment payload — includes privilege escalation fields */
export const MASS_ASSIGNMENT_FIELDS: Record<string, unknown> = {
  role: 'admin',
  is_admin: true,
  admin: true,
  permissions: ['*', 'admin:read', 'admin:write'],
  user_level: 0,
  access_level: 99,
};

/** Admin paths to probe for API5 */
export const ADMIN_PATHS = [
  '/admin',
  '/api/admin',
  '/api/admin/users',
  '/api/internal',
  '/api/internal/health',
  '/dashboard/admin',
  '/manage',
  '/superadmin',
  '/api/v1/admin',
  '/api/v2/admin',
];

/** Security headers that should be present */
export const SECURITY_HEADERS_EXPECTED = [
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
  'strict-transport-security',
  'content-security-policy',
];

/** Stack trace patterns to detect in error responses */
export const STACK_TRACE_PATTERNS = [
  /at\s+\w+\s+\(/,             // JavaScript/Node.js stack trace
  /File ".*\.py"/,             // Python traceback
  /\.(java|kt):\d+/,          // Java/Kotlin stack
  /\.rb:\d+/,                  // Ruby backtrace
  /System\.Exception/,         // .NET
  /\/var\/www\//,              // File path disclosure
  /\/home\/\w+\//,             // Home dir path disclosure
  /\/app\/src\//,              // Source path disclosure
  /node_modules\//,            // Node modules path
];

/**
 * Extracts the base URL of a given endpoint for admin path probing.
 * e.g. "https://api.example.com/api/v1/users/123" → "https://api.example.com"
 */
export function extractBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

/**
 * Mutates an ID in a URL path segment (increments numeric, swaps UUID).
 * e.g. "/users/123" → "/users/124"
 *      "/users/uuid-abc" → "/users/00000000-0000-0000-0000-000000000001"
 */
export function mutateIdInUrl(url: string): string | null {
  // Match numeric ID at end of path segment
  const numericMatch = url.match(/\/(\d+)(?:[/?]|$)/);
  if (numericMatch && numericMatch[1]) {
    const id = parseInt(numericMatch[1], 10);
    const newId = id === 1 ? 2 : id - 1;
    return url.replace(`/${numericMatch[1]}`, `/${newId}`);
  }

  // Match UUID
  const uuidMatch = url.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?]|$)/i);
  if (uuidMatch) {
    return url.replace(uuidMatch[1], '00000000-0000-0000-0000-000000000001');
  }

  return null; // No mutable ID found
}
