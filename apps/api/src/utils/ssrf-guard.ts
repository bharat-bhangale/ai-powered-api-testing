import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

/**
 * Blocked IP ranges — internal/private addresses.
 */
const BLOCKED_IP_RANGES = [
  /^127\./,                        // Loopback
  /^10\./,                         // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
  /^192\.168\./,                   // Private Class C
  /^169\.254\./,                   // Link-local / AWS metadata
  /^0\./,                          // Current network
  /^::1$/,                         // IPv6 loopback
  /^fe80:/,                        // IPv6 link-local
  /^fc00:/,                        // IPv6 unique local
  /^fd/,                           // IPv6 unique local
];

/**
 * Blocked hostnames — known internal/metadata endpoints.
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
];

/**
 * Validates a URL is safe to request from the server.
 * Blocks: non-HTTP protocols, internal hostnames, private IP ranges.
 * Throws descriptive error messages for blocked URLs.
 */
export async function validateUrl(rawUrl: string): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Block non-HTTP protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(
      `Protocol "${parsedUrl.protocol}" is not allowed. Use http:// or https://`,
    );
  }

  // Block known internal hostnames
  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(
      `Requests to "${hostname}" are blocked for security reasons`,
    );
  }

  // Resolve hostname to IP and check against blocked ranges
  try {
    const ips = await resolve4(hostname);
    for (const ip of ips) {
      for (const pattern of BLOCKED_IP_RANGES) {
        if (pattern.test(ip)) {
          throw new Error(
            'Requests to internal IP addresses are blocked for security reasons',
          );
        }
      }
    }
  } catch (err: unknown) {
    // Re-throw our own security errors
    if (err instanceof Error && err.message.includes('blocked')) throw err;
    // DNS resolution failure — let the actual HTTP request handle it
  }
}
