import { describe, it, expect } from 'vitest';
import { parsePostmanCollection } from '../parsers/postman.parser';

describe('postman.parser', () => {
  it('parses a minimal Postman collection', () => {
    const result = parsePostmanCollection({
      info: { name: 'Test API', description: 'A test collection', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Get Users',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users',
          },
        },
      ],
    });

    expect(result.name).toBe('Test API');
    expect(result.description).toBe('A test collection');
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0]?.method).toBe('GET');
    expect(result.requests[0]?.url).toBe('https://api.example.com/users');
  });

  it('parses nested folders recursively', () => {
    const result = parsePostmanCollection({
      info: { name: 'Nested', schema: '' },
      item: [
        {
          name: 'Auth',
          item: [
            {
              name: 'Login',
              request: { method: 'POST', url: 'https://api.example.com/auth/login' },
            },
            {
              name: 'Register',
              request: { method: 'POST', url: 'https://api.example.com/auth/register' },
            },
          ],
        },
        {
          name: 'Users',
          item: [
            {
              name: 'Get All',
              request: { method: 'GET', url: 'https://api.example.com/users' },
            },
          ],
        },
      ],
    });

    expect(result.folders).toHaveLength(2);
    expect(result.folders[0]?.name).toBe('Auth');
    expect(result.folders[1]?.name).toBe('Users');
    expect(result.requests).toHaveLength(3);
    expect(result.requests[0]?.folderPath).toBe('Auth');
    expect(result.requests[2]?.folderPath).toBe('Users');
  });

  it('parses URL object format with query params', () => {
    const result = parsePostmanCollection({
      info: { name: 'URL Obj', schema: '' },
      item: [
        {
          name: 'Search',
          request: {
            method: 'GET',
            url: {
              raw: 'https://api.example.com/search?q=hello',
              query: [
                { key: 'q', value: 'hello' },
                { key: 'page', value: '1' },
              ],
            },
          },
        },
      ],
    });

    expect(result.requests[0]?.url).toBe('https://api.example.com/search?q=hello');
    expect(result.requests[0]?.params).toHaveLength(2);
    expect(result.requests[0]?.params[0]?.key).toBe('q');
  });

  it('parses headers with disabled flag', () => {
    const result = parsePostmanCollection({
      info: { name: 'Headers', schema: '' },
      item: [
        {
          name: 'With Headers',
          request: {
            method: 'GET',
            url: 'https://api.example.com',
            header: [
              { key: 'Content-Type', value: 'application/json', disabled: false },
              { key: 'X-Debug', value: 'true', disabled: true },
            ],
          },
        },
      ],
    });

    expect(result.requests[0]?.headers).toHaveLength(2);
    expect(result.requests[0]?.headers[0]?.enabled).toBe(true);
    expect(result.requests[0]?.headers[1]?.enabled).toBe(false);
  });

  it('auto-detects JSON body mode', () => {
    const result = parsePostmanCollection({
      info: { name: 'Body', schema: '' },
      item: [
        {
          name: 'Create',
          request: {
            method: 'POST',
            url: 'https://api.example.com/users',
            body: { mode: 'raw', raw: '{"name":"John"}' },
          },
        },
      ],
    });

    expect(result.requests[0]?.body.mode).toBe('json');
    expect(result.requests[0]?.body.content).toBe('{"name":"John"}');
  });

  it('treats non-JSON raw body as raw', () => {
    const result = parsePostmanCollection({
      info: { name: 'Raw', schema: '' },
      item: [
        {
          name: 'Text',
          request: {
            method: 'POST',
            url: 'https://api.example.com',
            body: { mode: 'raw', raw: 'Hello world' },
          },
        },
      ],
    });

    expect(result.requests[0]?.body.mode).toBe('raw');
  });

  it('handles empty collection', () => {
    const result = parsePostmanCollection({
      info: { name: 'Empty', schema: '' },
      item: [],
    });

    expect(result.requests).toHaveLength(0);
    expect(result.folders).toHaveLength(0);
  });
});
