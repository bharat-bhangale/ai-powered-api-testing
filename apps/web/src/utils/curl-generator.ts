/**
 * cURL command generator — converts a request configuration into a cURL command.
 * Formats with line continuations for readability.
 */

interface CurlRequest {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  params: Array<{ key: string; value: string; enabled: boolean }>;
  body: { mode: string; content: string };
  auth: {
    type: string;
    bearer?: { token: string };
    basic?: { username: string; password: string };
    apiKey?: { key: string; value: string; addTo: string };
  };
}

export function generateCurl(request: CurlRequest): string {
  const parts: string[] = ['curl'];

  // Method (skip -X for GET)
  if (request.method !== 'GET') {
    parts.push(`-X ${request.method}`);
  }

  // Build URL with enabled query params
  let url = request.url;
  const enabledParams = request.params.filter((p) => p.enabled && p.key);
  if (enabledParams.length > 0) {
    const paramStr = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    url += (url.includes('?') ? '&' : '?') + paramStr;
  }
  parts.push(`'${url}'`);

  // Enabled headers
  const enabledHeaders = request.headers.filter((h) => h.enabled && h.key);
  enabledHeaders.forEach((h) => {
    parts.push(`-H '${h.key}: ${h.value}'`);
  });

  // Auth
  if (request.auth.type === 'bearer' && request.auth.bearer?.token) {
    parts.push(`-H 'Authorization: Bearer ${request.auth.bearer.token}'`);
  } else if (request.auth.type === 'basic' && request.auth.basic) {
    parts.push(`-u '${request.auth.basic.username}:${request.auth.basic.password}'`);
  } else if (request.auth.type === 'apikey' && request.auth.apiKey) {
    if (request.auth.apiKey.addTo === 'header') {
      parts.push(`-H '${request.auth.apiKey.key}: ${request.auth.apiKey.value}'`);
    }
  }

  // Body
  if (request.body.mode !== 'none' && request.body.content) {
    if (request.body.mode === 'json') {
      // Only add Content-Type if not already in headers
      const hasContentType = enabledHeaders.some(
        (h) => h.key.toLowerCase() === 'content-type',
      );
      if (!hasContentType) {
        parts.push(`-H 'Content-Type: application/json'`);
      }
    }
    parts.push(`--data-raw '${request.body.content}'`);
  }

  return parts.join(' \\\n  ');
}
