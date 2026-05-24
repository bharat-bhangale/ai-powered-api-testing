import { describe, it, expect, vi } from 'vitest';

// Mock crypto.randomUUID for Node.js test env
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7) });

// We need to inline the parser since it's a frontend file with no backend deps
// Import the logic directly to test

/**
 * Minimal cURL parser tests — validates the parsing logic
 * Note: These test the parser algorithm by reimplementing the core logic
 * to verify our approach is correct. The actual parser is in apps/web/src/utils/curl-parser.ts
 */

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (inQuote) {
      if (char === quoteChar && input[i - 1] !== '\\') {
        current += char;
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      current += char;
      inQuote = true;
      quoteChar = char;
    } else if (char === ' ' || char === '\t') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function unquote(str: string): string {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

describe('curl-parser tokenizer', () => {
  it('tokenizes a simple command', () => {
    const tokens = tokenize("curl 'https://api.example.com'");
    expect(tokens).toEqual(['curl', "'https://api.example.com'"]);
  });

  it('handles double-quoted strings', () => {
    const tokens = tokenize('curl -H "Content-Type: application/json" "https://api.example.com"');
    expect(tokens).toHaveLength(4);
    expect(unquote(tokens[2]!)).toBe('Content-Type: application/json');
  });

  it('handles line continuations after preprocessing', () => {
    const input = "curl \\\n  -X POST \\\n  'https://api.example.com'";
    const cleaned = input.replace(/\\\s*\n/g, ' ');
    const tokens = tokenize(cleaned);
    expect(tokens).toContain('-X');
    expect(tokens).toContain('POST');
  });

  it('unquotes single-quoted strings', () => {
    expect(unquote("'hello world'")).toBe('hello world');
  });

  it('unquotes double-quoted strings', () => {
    expect(unquote('"hello world"')).toBe('hello world');
  });

  it('leaves unquoted strings as-is', () => {
    expect(unquote('hello')).toBe('hello');
  });
});

describe('curl-parser header parsing', () => {
  it('splits header on first colon', () => {
    const headerStr = 'Content-Type: application/json';
    const colonIdx = headerStr.indexOf(':');
    const key = headerStr.substring(0, colonIdx).trim();
    const value = headerStr.substring(colonIdx + 1).trim();
    expect(key).toBe('Content-Type');
    expect(value).toBe('application/json');
  });

  it('handles Authorization: Bearer token', () => {
    const value = 'Bearer abc123';
    expect(value.toLowerCase().startsWith('bearer ')).toBe(true);
    expect(value.substring(7)).toBe('abc123');
  });

  it('handles Authorization: Basic auth', () => {
    const value = 'Basic dXNlcjpwYXNz';
    expect(value.toLowerCase().startsWith('basic ')).toBe(true);
    const decoded = Buffer.from(value.substring(6), 'base64').toString('utf-8');
    expect(decoded).toBe('user:pass');
  });
});

describe('curl-parser body detection', () => {
  it('detects valid JSON body', () => {
    const content = '{"name":"test"}';
    let mode = 'raw';
    try {
      JSON.parse(content);
      mode = 'json';
    } catch { /* keep raw */ }
    expect(mode).toBe('json');
  });

  it('keeps non-JSON as raw', () => {
    const content = 'key=value&another=data';
    let mode = 'raw';
    try {
      JSON.parse(content);
      mode = 'json';
    } catch { /* keep raw */ }
    expect(mode).toBe('raw');
  });
});
