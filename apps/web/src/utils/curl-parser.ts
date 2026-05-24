/**
 * cURL command parser — converts a cURL command string into structured request config.
 * Handles: -X, -H, -d, -u, -L, -k flags, Authorization header detection,
 * auto-detect JSON body, URL query params extraction.
 */

interface ParsedCurlRequest {
  method: string;
  url: string;
  headers: Array<{ id: string; key: string; value: string; description: string; enabled: boolean }>;
  params: Array<{ id: string; key: string; value: string; description: string; enabled: boolean }>;
  body: { mode: 'none' | 'json' | 'raw'; content: string };
  auth: {
    type: 'none' | 'bearer' | 'basic';
    bearer?: { token: string };
    basic?: { username: string; password: string };
  };
}

export function parseCurl(curlCommand: string): ParsedCurlRequest {
  // Normalize: remove line continuations and trim
  let cmd = curlCommand.trim().replace(/\\\s*\n/g, ' ').replace(/\\\s*\r\n/g, ' ');

  // Remove 'curl' prefix
  cmd = cmd.replace(/^curl\s+/, '');

  const result: ParsedCurlRequest = {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: { mode: 'none', content: '' },
    auth: { type: 'none' },
  };

  let methodExplicit = false;

  const tokens = tokenize(cmd);
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i]!;

    switch (token) {
      case '-X':
      case '--request':
        i++;
        result.method = tokens[i]?.toUpperCase() || 'GET';
        methodExplicit = true;
        break;

      case '-H':
      case '--header':
        i++;
        if (tokens[i]) {
          const headerStr = unquote(tokens[i]!);
          const colonIdx = headerStr.indexOf(':');
          if (colonIdx > 0) {
            const key = headerStr.substring(0, colonIdx).trim();
            const value = headerStr.substring(colonIdx + 1).trim();

            // Check for auth headers
            if (key.toLowerCase() === 'authorization') {
              if (value.toLowerCase().startsWith('bearer ')) {
                result.auth = { type: 'bearer', bearer: { token: value.substring(7) } };
              } else if (value.toLowerCase().startsWith('basic ')) {
                try {
                  const decoded = atob(value.substring(6));
                  const [username, ...passParts] = decoded.split(':');
                  result.auth = { type: 'basic', basic: { username: username || '', password: passParts.join(':') } };
                } catch {
                  result.headers.push({ id: crypto.randomUUID(), key, value, description: '', enabled: true });
                }
              }
            } else {
              result.headers.push({ id: crypto.randomUUID(), key, value, description: '', enabled: true });
            }
          }
        }
        break;

      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-binary':
        i++;
        if (tokens[i]) {
          const bodyContent = unquote(tokens[i]!);
          result.body = { mode: 'raw', content: bodyContent };

          // Auto-detect JSON
          try {
            JSON.parse(bodyContent);
            result.body.mode = 'json';
          } catch {
            // Keep as raw
          }

          // Auto-set method to POST if not explicitly set
          if (!methodExplicit) result.method = 'POST';
        }
        break;

      case '-u':
      case '--user':
        i++;
        if (tokens[i]) {
          const [username, ...passParts] = unquote(tokens[i]!).split(':');
          result.auth = { type: 'basic', basic: { username: username || '', password: passParts.join(':') || '' } };
        }
        break;

      case '-L':
      case '--location':
      case '-k':
      case '--insecure':
      case '-v':
      case '--verbose':
      case '-s':
      case '--silent':
      case '-S':
      case '--show-error':
        // Flags we acknowledge but don't act on
        break;

      default:
        // If it looks like a URL
        if (!token.startsWith('-')) {
          const urlStr = unquote(token);
          if (urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.includes('://')) {
            try {
              const parsed = new URL(urlStr);
              result.url = `${parsed.origin}${parsed.pathname}`;

              parsed.searchParams.forEach((value, key) => {
                result.params.push({
                  id: crypto.randomUUID(),
                  key,
                  value,
                  description: '',
                  enabled: true,
                });
              });
            } catch {
              result.url = urlStr;
            }
          }
        }
    }

    i++;
  }

  // Add empty trailing row for the editor UI
  result.headers.push({ id: crypto.randomUUID(), key: '', value: '', description: '', enabled: true });
  result.params.push({ id: crypto.randomUUID(), key: '', value: '', description: '', enabled: true });

  return result;
}

/**
 * Tokenize a cURL command string, respecting single and double quotes.
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

/**
 * Remove surrounding quotes from a string.
 */
function unquote(str: string): string {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}
