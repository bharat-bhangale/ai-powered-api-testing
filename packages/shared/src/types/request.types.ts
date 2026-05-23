/**
 * HTTP Methods supported by the API testing tool.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Represents a single key-value pair used in headers, params, and form data.
 * Includes an enable/disable toggle and optional description.
 */
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

/**
 * Request body configuration — supports multiple encoding modes.
 */
export interface RequestBody {
  mode: 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw' | 'binary' | 'graphql';
  content: string;
  contentType?: string;
}

/**
 * Authentication configuration for a request.
 * Supports API Key, Bearer Token, and Basic Auth.
 */
export interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'basic';
  apiKey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
  bearer?: {
    token: string;
  };
  basic?: {
    username: string;
    password: string;
  };
}

/**
 * Complete request configuration — everything needed to execute an HTTP call.
 */
export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  settings?: {
    timeout?: number;
    followRedirects?: boolean;
    maxRedirects?: number;
  };
}
