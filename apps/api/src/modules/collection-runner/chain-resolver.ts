export interface ChainContextData {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  timing: number;
}

/**
 * Resolves {{chain.RequestName.body.path.to.data[0].id}} variables.
 * Keyed by request name.
 */
export class ChainResolver {
  private context: Map<string, ChainContextData>;

  constructor(context: Map<string, ChainContextData>) {
    this.context = context;
  }

  /**
   * Replace all {{chain.XXX}} patterns in a string.
   */
  resolve(input: string, warnings: string[] = []): string {
    if (!input || typeof input !== 'string') return input;

    // {{chain.Login.body.token}}
    return input.replace(/\{\{chain\.([^}]+)\}\}/g, (match: string, pathExpression: string): string => {
      const parts = this.parsePath(pathExpression);
      if (parts.length === 0) {
        warnings.push(`Invalid chain expression: ${match}`);
        return match;
      }

      const requestName = parts[0]!;
      const requestData = this.context.get(requestName);

      if (!requestData) {
        warnings.push(`Chain warning: Request "${requestName}" not found or hasn't executed yet (${match})`);
        return match;
      }

      // Navigate down the object path
      let current: unknown = requestData;
      for (let i = 1; i < parts.length; i++) {
        if (current === null || current === undefined) {
          warnings.push(`Chain warning: Could not resolve path "${parts[i]}" on undefined value (${match})`);
          return match;
        }

        const key = parts[i]!;
        if (typeof current === 'object') {
          current = (current as Record<string, unknown>)[key];
        } else {
          warnings.push(`Chain warning: Attempted to access property "${key}" on a non-object (${match})`);
          return match;
        }
      }

      if (current === undefined) {
        warnings.push(`Chain warning: Path resolved to undefined (${match})`);
        return match;
      }

      if (typeof current === 'string') return current;
      if (typeof current === 'number' || typeof current === 'boolean') return String(current);
      return JSON.stringify(current);
    });
  }

  /**
   * Helper to resolve headers array from DB format
   */
  resolveKeyValues(
    pairs: Array<{ key: string; value: string; enabled?: boolean }>,
    warnings: string[],
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (!Array.isArray(pairs)) return result;

    for (const pair of pairs) {
      if ((pair.enabled ?? true) && pair.key) {
        const resolvedKey = this.resolve(pair.key, warnings);
        const resolvedValue = this.resolve(pair.value, warnings);
        result[resolvedKey] = resolvedValue;
      }
    }
    return result;
  }

  /**
   * Helper to resolve body
   */
  resolveBody(body: { mode: string; content: string }, warnings: string[]): unknown {
    if (!body || body.mode === 'none' || !body.content) return undefined;

    const resolvedContent = this.resolve(body.content, warnings);

    if (body.mode === 'json') {
      try {
        return JSON.parse(resolvedContent);
      } catch {
        return resolvedContent;
      }
    }

    return resolvedContent;
  }

  /**
   * Parse dot-notation and bracket-notation path into array of keys.
   * e.g., "RequestName.body.data[0].id" -> ["RequestName", "body", "data", "0", "id"]
   */
  private parsePath(path: string): string[] {
    const keys: string[] = [];
    // This regex splits by dots, but correctly handles array indices like [0] by pulling the number out
    // Actually, simple split/replace is easier:
    // "RequestName.body.data[0].id" -> "RequestName.body.data.0.id" -> split('.')
    const normalized = path.replace(/\[(\d+)\]/g, '.$1');
    for (const p of normalized.split('.')) {
      if (p) keys.push(p);
    }
    return keys;
  }
}
