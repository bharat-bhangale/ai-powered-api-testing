/**
 * payload-generators.ts
 * Static fuzz payload library for each category.
 * All size-attack strings are capped at 1MB.
 */

export type FuzzCategory =
  | 'boundary'
  | 'type_confusion'
  | 'injection'
  | 'xss'
  | 'unicode'
  | 'format'
  | 'size';

export const ALL_FUZZ_CATEGORIES: FuzzCategory[] = [
  'boundary', 'type_confusion', 'injection', 'xss', 'unicode', 'format', 'size',
];

export interface FuzzPayload {
  category: FuzzCategory;
  label: string;
  value: unknown;
}

// ── 1. Boundary Values ──────────────────────────────────────────

export const BOUNDARY_PAYLOADS: FuzzPayload[] = [
  { category: 'boundary', label: 'zero',             value: 0 },
  { category: 'boundary', label: 'negative one',     value: -1 },
  { category: 'boundary', label: 'one',              value: 1 },
  { category: 'boundary', label: 'int32 min',        value: -2147483648 },
  { category: 'boundary', label: 'int32 max',        value: 2147483647 },
  { category: 'boundary', label: 'max safe int',     value: Number.MAX_SAFE_INTEGER },
  { category: 'boundary', label: 'NaN',              value: 'NaN' },
  { category: 'boundary', label: 'Infinity',         value: 'Infinity' },
  { category: 'boundary', label: 'float',            value: 0.1 },
  { category: 'boundary', label: 'large number',     value: 99999999999 },
  { category: 'boundary', label: 'empty string',     value: '' },
  { category: 'boundary', label: 'space only',       value: ' ' },
  { category: 'boundary', label: 'null char',        value: '\0' },
  { category: 'boundary', label: 'empty array',      value: [] },
  { category: 'boundary', label: 'array with null',  value: [null] },
];

// ── 2. Type Confusion ───────────────────────────────────────────

export const TYPE_CONFUSION_PAYLOADS: FuzzPayload[] = [
  { category: 'type_confusion', label: 'string "abc"',       value: 'abc' },
  { category: 'type_confusion', label: 'string "123abc"',    value: '123abc' },
  { category: 'type_confusion', label: 'string "true"',      value: 'true' },
  { category: 'type_confusion', label: 'number 42',          value: 42 },
  { category: 'type_confusion', label: 'number 0',           value: 0 },
  { category: 'type_confusion', label: 'number -1',          value: -1 },
  { category: 'type_confusion', label: 'empty array',        value: [] },
  { category: 'type_confusion', label: 'empty object',       value: {} },
  { category: 'type_confusion', label: 'null',               value: null },
  { category: 'type_confusion', label: 'boolean true',       value: true },
  { category: 'type_confusion', label: 'boolean false',      value: false },
  { category: 'type_confusion', label: 'array in object',    value: ['unexpected', 'array'] },
  { category: 'type_confusion', label: 'nested object',      value: { nested: { deep: true } } },
];

// ── 3. Injection ────────────────────────────────────────────────

export const INJECTION_PAYLOADS: FuzzPayload[] = [
  // SQL Injection
  { category: 'injection', label: "SQL drop table",     value: "'; DROP TABLE users;--" },
  { category: 'injection', label: "SQL OR bypass",      value: "' OR '1'='1" },
  { category: 'injection', label: "SQL select",         value: "1; SELECT * FROM users" },
  { category: 'injection', label: "SQL comment",        value: "admin'--" },
  { category: 'injection', label: "SQL union",          value: "' UNION SELECT 1,2,3--" },
  // NoSQL Injection
  { category: 'injection', label: "NoSQL $gt",          value: { $gt: '' } },
  { category: 'injection', label: "NoSQL $ne",          value: { $ne: null } },
  { category: 'injection', label: "NoSQL $where",       value: { $where: 'sleep(5000)' } },
  { category: 'injection', label: "NoSQL $regex",       value: { $regex: '.*' } },
  // Command Injection
  { category: 'injection', label: "cmd ls",             value: '; ls -la' },
  { category: 'injection', label: "cmd cat passwd",     value: '| cat /etc/passwd' },
  { category: 'injection', label: "cmd backtick",       value: '`whoami`' },
  { category: 'injection', label: "cmd semicolon",      value: '; rm -rf /' },
  // Path Traversal
  { category: 'injection', label: "path traversal",     value: '../../etc/passwd' },
  { category: 'injection', label: "path traversal win", value: '..\\..\\windows\\system32' },
];

// ── 4. XSS Payloads ─────────────────────────────────────────────

export const XSS_PAYLOADS: FuzzPayload[] = [
  { category: 'xss', label: "script tag",          value: '<script>alert(1)</script>' },
  { category: 'xss', label: "img onerror",         value: '<img onerror=alert(1) src=x>' },
  { category: 'xss', label: "javascript: URI",     value: 'javascript:alert(1)' },
  { category: 'xss', label: "svg onload",          value: '<svg onload=alert(1)>' },
  { category: 'xss', label: "data URI",            value: 'data:text/html,<script>alert(1)</script>' },
  { category: 'xss', label: "event handler",       value: '" onmouseover="alert(1)"' },
  { category: 'xss', label: "iframe src",          value: "<iframe src=javascript:alert(1)>" },
  { category: 'xss', label: "encoded script",      value: '&lt;script&gt;alert(1)&lt;/script&gt;' },
  { category: 'xss', label: "expression",          value: '"><script>alert(document.cookie)</script>' },
  { category: 'xss', label: "style attr",          value: '<div style="background:url(javascript:alert(1))">' },
];

// ── 5. Unicode & Encoding ────────────────────────────────────────

export const UNICODE_PAYLOADS: FuzzPayload[] = [
  { category: 'unicode', label: "zero-width space",    value: 'hello\u200Bworld' },
  { category: 'unicode', label: "RTL override",        value: 'hello\u202Eworld' },
  { category: 'unicode', label: "emoji",               value: '😀🎉💩🔥' },
  { category: 'unicode', label: "null byte",           value: 'hello\x00world' },
  { category: 'unicode', label: "BOM marker",          value: '\uFEFFtest' },
  { category: 'unicode', label: "replacement char",    value: '\uFFFD' },
  { category: 'unicode', label: "mixed RTL/LTR",       value: 'hello\u202Eolleh' },
  { category: 'unicode', label: "long unicode",        value: '\u00e9'.repeat(500) },
  { category: 'unicode', label: "zero-width joiner",   value: 'a\u200Db\u200Dc' },
  { category: 'unicode', label: "control chars",       value: '\x01\x02\x03\x04\x05' },
];

// ── 6. Format Violations ────────────────────────────────────────

export const FORMAT_PAYLOADS: FuzzPayload[] = [
  // Email
  { category: 'format', label: "not an email",          value: 'not-an-email' },
  { category: 'format', label: "missing local",         value: '@missing.com' },
  { category: 'format', label: "missing domain",        value: 'a@.com' },
  { category: 'format', label: "SQL in email",          value: "admin'--@test.com" },
  // Date
  { category: 'format', label: "invalid date month",    value: '2025-13-32' },
  { category: 'format', label: "not a date",            value: 'not-a-date' },
  { category: 'format', label: "zero date",             value: '0000-00-00' },
  { category: 'format', label: "far future",            value: '9999-99-99' },
  // UUID
  { category: 'format', label: "not a UUID",            value: 'not-a-uuid' },
  { category: 'format', label: "null UUID",             value: '00000000-0000-0000-0000-000000000000' },
  // JSON
  { category: 'format', label: "invalid JSON obj",      value: '{"key": }' },
  { category: 'format', label: "incomplete JSON",       value: '{incomplete' },
  { category: 'format', label: "trailing comma",        value: '{"a":1,}' },
];

// ── 7. Size Attacks (capped at 1MB) ─────────────────────────────

function buildDeeplyNested(depth: number): unknown {
  if (depth === 0) return 'leaf';
  return { nested: buildDeeplyNested(depth - 1) };
}

export const SIZE_PAYLOADS: FuzzPayload[] = [
  { category: 'size', label: "10KB string",        value: 'A'.repeat(10_000) },
  { category: 'size', label: "100KB string",       value: 'A'.repeat(100_000) },
  { category: 'size', label: "1MB string",         value: 'A'.repeat(1_000_000) },
  { category: 'size', label: "deep nesting 50lvl", value: buildDeeplyNested(50) },
  { category: 'size', label: "1000 fields",        value: Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`field${i}`, i])) },
  { category: 'size', label: "array 5000 items",   value: Array.from({ length: 5000 }, (_, i) => i) },
  { category: 'size', label: "long key name",      value: { ['x'.repeat(10000)]: 'value' } },
];

// ── Payload lookup map ──────────────────────────────────────────

export const CATEGORY_PAYLOADS: Record<FuzzCategory, FuzzPayload[]> = {
  boundary:      BOUNDARY_PAYLOADS,
  type_confusion: TYPE_CONFUSION_PAYLOADS,
  injection:     INJECTION_PAYLOADS,
  xss:           XSS_PAYLOADS,
  unicode:       UNICODE_PAYLOADS,
  format:        FORMAT_PAYLOADS,
  size:          SIZE_PAYLOADS,
};

export const CATEGORY_LABELS: Record<FuzzCategory, string> = {
  boundary:      'Boundary Values',
  type_confusion: 'Type Confusion',
  injection:     'Injection (SQL/NoSQL/Cmd)',
  xss:           'XSS Payloads',
  unicode:       'Unicode & Encoding',
  format:        'Format Violations',
  size:          'Size Attacks',
};

/**
 * Get all payloads for the requested categories, capped at maxPayloads total.
 */
export function getPayloads(categories: FuzzCategory[], maxPayloads = 200): FuzzPayload[] {
  const all: FuzzPayload[] = [];
  for (const cat of categories) {
    all.push(...(CATEGORY_PAYLOADS[cat] ?? []));
  }
  return all.slice(0, maxPayloads);
}
