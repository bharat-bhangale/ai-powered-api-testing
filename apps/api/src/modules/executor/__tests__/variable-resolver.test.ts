import { describe, it, expect } from 'vitest';
import { VariableResolver } from '../variable-resolver';

describe('VariableResolver', () => {
  // ===== resolve() =====

  describe('resolve', () => {
    it('should replace a simple variable', () => {
      const resolver = new VariableResolver({ base_url: 'https://api.example.com' });
      expect(resolver.resolve('{{base_url}}/posts')).toBe('https://api.example.com/posts');
    });

    it('should replace multiple variables', () => {
      const resolver = new VariableResolver({
        protocol: 'https',
        host: 'api.example.com',
        path: 'v1/users',
      });
      expect(resolver.resolve('{{protocol}}://{{host}}/{{path}}')).toBe('https://api.example.com/v1/users');
    });

    it('should handle nested resolution (2 levels)', () => {
      const resolver = new VariableResolver({
        full_url: '{{protocol}}://example.com',
        protocol: 'https',
      });
      expect(resolver.resolve('{{full_url}}/api')).toBe('https://example.com/api');
    });

    it('should handle nested resolution up to 3 levels', () => {
      const resolver = new VariableResolver({
        url: '{{host}}/api',
        host: '{{scheme}}://example.com',
        scheme: 'https',
      });
      expect(resolver.resolve('{{url}}')).toBe('https://example.com/api');
    });

    it('should leave unresolved variables as-is', () => {
      const resolver = new VariableResolver({ base_url: 'https://api.example.com' });
      expect(resolver.resolve('{{base_url}}/{{unknown}}')).toBe('https://api.example.com/{{unknown}}');
    });

    it('should return empty string for empty input', () => {
      const resolver = new VariableResolver({ base_url: 'test' });
      expect(resolver.resolve('')).toBe('');
    });

    it('should return plain text unchanged', () => {
      const resolver = new VariableResolver({ base_url: 'test' });
      expect(resolver.resolve('plain text')).toBe('plain text');
    });

    it('should trim whitespace in variable keys', () => {
      const resolver = new VariableResolver({ base_url: 'https://api.example.com' });
      expect(resolver.resolve('{{ base_url }}/api')).toBe('https://api.example.com/api');
    });

    it('should handle null/undefined gracefully', () => {
      const resolver = new VariableResolver({});
      expect(resolver.resolve(null as unknown as string)).toBe(null);
      expect(resolver.resolve(undefined as unknown as string)).toBe(undefined);
    });
  });

  // ===== resolveKeyValues() =====

  describe('resolveKeyValues', () => {
    it('should resolve both keys and values', () => {
      const resolver = new VariableResolver({
        header_name: 'Authorization',
        token: 'abc123',
      });
      const result = resolver.resolveKeyValues([
        { key: '{{header_name}}', value: 'Bearer {{token}}', enabled: true },
      ]);
      expect(result).toEqual({ Authorization: 'Bearer abc123' });
    });

    it('should only include enabled pairs', () => {
      const resolver = new VariableResolver({ key: 'val' });
      const result = resolver.resolveKeyValues([
        { key: 'active', value: 'yes', enabled: true },
        { key: 'disabled', value: 'no', enabled: false },
      ]);
      expect(result).toEqual({ active: 'yes' });
    });

    it('should skip empty keys', () => {
      const resolver = new VariableResolver({});
      const result = resolver.resolveKeyValues([
        { key: '', value: 'value', enabled: true },
        { key: 'real', value: 'data', enabled: true },
      ]);
      expect(result).toEqual({ real: 'data' });
    });

    it('should handle empty array', () => {
      const resolver = new VariableResolver({});
      expect(resolver.resolveKeyValues([])).toEqual({});
    });
  });

  // ===== resolveBody() =====

  describe('resolveBody', () => {
    it('should resolve variables in JSON body and parse', () => {
      const resolver = new VariableResolver({ name: 'John' });
      const result = resolver.resolveBody({
        mode: 'json',
        content: '{"name": "{{name}}"}',
      });
      expect(result).toEqual({ name: 'John' });
    });

    it('should return resolved string for non-JSON mode', () => {
      const resolver = new VariableResolver({ user: 'admin' });
      const result = resolver.resolveBody({
        mode: 'raw',
        content: 'user={{user}}',
      });
      expect(result).toBe('user=admin');
    });

    it('should return undefined for mode "none"', () => {
      const resolver = new VariableResolver({});
      expect(resolver.resolveBody({ mode: 'none', content: 'test' })).toBeUndefined();
    });

    it('should return undefined for empty content', () => {
      const resolver = new VariableResolver({});
      expect(resolver.resolveBody({ mode: 'json', content: '' })).toBeUndefined();
    });

    it('should return raw string if JSON parse fails', () => {
      const resolver = new VariableResolver({ val: 'not-json' });
      const result = resolver.resolveBody({
        mode: 'json',
        content: '{{val}}',
      });
      expect(result).toBe('not-json');
    });
  });
});
