import type { VariableResolver } from './variable-resolver';

interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'basic';
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  bearer?: { token: string };
  basic?: { username: string; password: string };
}

interface AuthResolution {
  headers: Record<string, string>;
  params: Record<string, string>;
}

/**
 * Auth Resolver — converts auth config into headers/params for the request.
 * Uses VariableResolver so auth values support {{variables}}.
 */
export class AuthResolver {
  resolve(auth: AuthConfig | undefined, resolver: VariableResolver): AuthResolution {
    const result: AuthResolution = { headers: {}, params: {} };

    if (!auth || auth.type === 'none') return result;

    switch (auth.type) {
      case 'apikey': {
        const key = resolver.resolve(auth.apiKey?.key || '');
        const value = resolver.resolve(auth.apiKey?.value || '');
        if (key) {
          if (auth.apiKey?.addTo === 'query') {
            result.params[key] = value;
          } else {
            result.headers[key] = value;
          }
        }
        break;
      }
      case 'bearer': {
        const token = resolver.resolve(auth.bearer?.token || '');
        if (token) {
          result.headers['Authorization'] = `Bearer ${token}`;
        }
        break;
      }
      case 'basic': {
        const username = resolver.resolve(auth.basic?.username || '');
        const password = resolver.resolve(auth.basic?.password || '');
        const encoded = Buffer.from(`${username}:${password}`).toString('base64');
        result.headers['Authorization'] = `Basic ${encoded}`;
        break;
      }
    }

    return result;
  }
}
