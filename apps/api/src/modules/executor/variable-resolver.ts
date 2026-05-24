/**
 * Variable Resolver — replaces all {{variable_name}} patterns in strings.
 * Supports nested resolution up to 3 levels deep.
 * Unresolved variables stay as-is (no crash).
 */
export class VariableResolver {
  private variables: Record<string, string>;

  constructor(variables: Record<string, string>) {
    this.variables = variables;
  }

  /**
   * Replace all {{variable}} patterns in a string.
   * Supports nested resolution up to 3 levels deep.
   */
  resolve(input: string): string {
    if (!input || typeof input !== 'string') return input;

    let result = input;
    let depth = 0;
    const maxDepth = 3;

    while (depth < maxDepth && result.includes('{{')) {
      result = result.replace(/\{\{([^{}]+)\}\}/g, (_match: string, key: string): string => {
        const trimmedKey = key.trim();
        if (trimmedKey in this.variables) {
          return this.variables[trimmedKey]!;
        }
        return `{{${key}}}`; // Keep unresolved variables as-is
      });
      depth++;
    }

    return result;
  }

  /**
   * Resolve variables in all values of a key-value pair array.
   * Only includes enabled pairs with non-empty keys.
   */
  resolveKeyValues(
    pairs: Array<{ key: string; value: string; enabled?: boolean }>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (!Array.isArray(pairs)) return result;

    for (const pair of pairs) {
      if ((pair.enabled ?? true) && pair.key) {
        result[this.resolve(pair.key)] = this.resolve(pair.value);
      }
    }
    return result;
  }

  /**
   * Resolve variables in a request body.
   * For JSON mode, parses the resolved string into an object.
   */
  resolveBody(body: { mode: string; content: string }): unknown {
    if (!body || body.mode === 'none' || !body.content) return undefined;

    const resolvedContent = this.resolve(body.content);

    if (body.mode === 'json') {
      try {
        return JSON.parse(resolvedContent);
      } catch {
        return resolvedContent;
      }
    }

    return resolvedContent;
  }
}
