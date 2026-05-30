/**
 * Assertion Library — provides the `atx.expect(value)` chain API.
 *
 * Usage:
 *   atx.expect(200).toBe(200);           // pass
 *   atx.expect([1]).toBeArray();          // pass
 *   atx.expect("foo").not.toBe("bar");    // pass (negated)
 *
 * Every assertion method throws AssertionError on failure.
 */

// ===== Error Type =====

export class AssertionError extends Error {
  expected: unknown;
  actual: unknown;

  constructor(message: string, expected: unknown, actual: unknown) {
    super(message);
    this.name = 'AssertionError';
    this.expected = expected;
    this.actual = actual;
  }
}

// ===== Assertion Chain =====

export interface ExpectChain {
  /** Negate the next assertion */
  not: ExpectChain;

  /** Strict equality (===) */
  toBe(expected: unknown): void;
  /** Deep equality (objects/arrays) */
  toEqual(expected: unknown): void;

  /** Value is truthy */
  toBeTruthy(): void;
  /** Value is falsy */
  toBeFalsy(): void;
  /** Value is null */
  toBeNull(): void;
  /** Value is undefined */
  toBeUndefined(): void;
  /** Value is not undefined */
  toBeDefined(): void;

  /** Value is an array */
  toBeArray(): void;
  /** Value is a plain object */
  toBeObject(): void;
  /** Value is a string */
  toBeString(): void;
  /** Value is a number */
  toBeNumber(): void;

  /** Array/string has exact length */
  toHaveLength(length: number): void;
  /** Array includes item or string includes substring */
  toContain(item: unknown): void;
  /** Object has a property (optionally with a specific value) */
  toHaveProperty(key: string, value?: unknown): void;
  /** String matches a regex */
  toMatch(pattern: RegExp | string): void;
  /** Object conforms to a JSON Schema (subset validation) */
  toMatchSchema(schema: Record<string, unknown>): void;

  /** Number > n */
  toBeGreaterThan(n: number): void;
  /** Number < n */
  toBeLessThan(n: number): void;
  /** Number >= n */
  toBeGreaterThanOrEqual(n: number): void;
  /** Number <= n */
  toBeLessThanOrEqual(n: number): void;
}

// ===== Implementation =====

function stringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

function getNestedProperty(obj: unknown, path: string): { exists: boolean; value: unknown } {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return { exists: false, value: undefined };
    }
    const record = current as Record<string, unknown>;
    if (!(key in record)) {
      return { exists: false, value: undefined };
    }
    current = record[key];
  }

  return { exists: true, value: current };
}

/**
 * Creates the expect(value) chain.
 */
export function createExpect(actual: unknown, negated = false): ExpectChain {
  /**
   * Evaluates an assertion. If `negated`, the assertion passes when the
   * condition is false, and fails when the condition is true.
   */
  const assert = (
    condition: boolean,
    message: string,
    expected: unknown,
    actualDisplay: unknown = actual,
  ): void => {
    const passed = negated ? !condition : condition;
    if (!passed) {
      const prefix = negated ? 'Expected NOT: ' : 'Expected: ';
      throw new AssertionError(
        `${prefix}${message}`,
        expected,
        actualDisplay,
      );
    }
  };

  const chain: ExpectChain = {
    get not(): ExpectChain {
      return createExpect(actual, !negated);
    },

    toBe(expected: unknown) {
      assert(
        actual === expected,
        `${stringify(actual)} to be ${stringify(expected)}`,
        expected,
      );
    },

    toEqual(expected: unknown) {
      assert(
        deepEqual(actual, expected),
        `${stringify(actual)} to deeply equal ${stringify(expected)}`,
        expected,
      );
    },

    toBeTruthy() {
      assert(!!actual, `${stringify(actual)} to be truthy`, 'truthy value');
    },

    toBeFalsy() {
      assert(!actual, `${stringify(actual)} to be falsy`, 'falsy value');
    },

    toBeNull() {
      assert(actual === null, `${stringify(actual)} to be null`, null);
    },

    toBeUndefined() {
      assert(actual === undefined, `${stringify(actual)} to be undefined`, undefined);
    },

    toBeDefined() {
      assert(actual !== undefined, `${stringify(actual)} to be defined`, 'defined value');
    },

    toBeArray() {
      assert(Array.isArray(actual), `${stringify(actual)} to be an array`, 'Array');
    },

    toBeObject() {
      assert(
        typeof actual === 'object' && actual !== null && !Array.isArray(actual),
        `${stringify(actual)} to be an object`,
        'Object',
      );
    },

    toBeString() {
      assert(typeof actual === 'string', `${stringify(actual)} to be a string`, 'string');
    },

    toBeNumber() {
      assert(typeof actual === 'number', `${stringify(actual)} to be a number`, 'number');
    },

    toHaveLength(length: number) {
      const actualLength = (actual as { length?: number })?.length;
      assert(
        actualLength === length,
        `value to have length ${length}, but got ${actualLength}`,
        length,
        actualLength,
      );
    },

    toContain(item: unknown) {
      if (typeof actual === 'string') {
        assert(
          actual.includes(String(item)),
          `"${actual}" to contain "${String(item)}"`,
          item,
        );
      } else if (Array.isArray(actual)) {
        const found = actual.some((el) => deepEqual(el, item));
        assert(found, `array to contain ${stringify(item)}`, item);
      } else {
        assert(false, `${stringify(actual)} to be iterable (string or array)`, item);
      }
    },

    toHaveProperty(key: string, value?: unknown) {
      const { exists, value: propValue } = getNestedProperty(actual, key);
      assert(exists, `object to have property "${key}"`, key);

      if (arguments.length >= 2) {
        assert(
          deepEqual(propValue, value),
          `property "${key}" to be ${stringify(value)}, but got ${stringify(propValue)}`,
          value,
          propValue,
        );
      }
    },

    toMatch(pattern: RegExp | string) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      assert(
        typeof actual === 'string' && regex.test(actual),
        `"${String(actual)}" to match ${regex.toString()}`,
        regex.toString(),
      );
    },

    toMatchSchema(schema: Record<string, unknown>) {
      // Lightweight JSON Schema validation (type + required fields)
      const schemaType = schema.type as string | undefined;
      const required = schema.required as string[] | undefined;
      const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;

      if (schemaType === 'object') {
        assert(
          typeof actual === 'object' && actual !== null && !Array.isArray(actual),
          'value to be an object (schema expects object)',
          'object',
        );

        if (required && Array.isArray(required)) {
          const obj = actual as Record<string, unknown>;
          for (const field of required) {
            assert(
              field in obj,
              `object to have required field "${field}"`,
              field,
            );
          }
        }

        if (properties) {
          const obj = actual as Record<string, unknown>;
          for (const [key, propSchema] of Object.entries(properties)) {
            if (key in obj && propSchema.type) {
              const expectedType = propSchema.type as string;
              const actualType = Array.isArray(obj[key]) ? 'array' : typeof obj[key];
              if (obj[key] !== null && obj[key] !== undefined) {
                assert(
                  actualType === expectedType,
                  `property "${key}" to be type "${expectedType}", got "${actualType}"`,
                  expectedType,
                  actualType,
                );
              }
            }
          }
        }
      } else if (schemaType === 'array') {
        assert(Array.isArray(actual), 'value to be an array (schema expects array)', 'array');
      } else if (schemaType) {
        const actualType = typeof actual;
        assert(
          actualType === schemaType,
          `value to be type "${schemaType}", got "${actualType}"`,
          schemaType,
          actualType,
        );
      }
    },

    toBeGreaterThan(n: number) {
      assert(
        typeof actual === 'number' && actual > n,
        `${actual} to be greater than ${n}`,
        `> ${n}`,
      );
    },

    toBeLessThan(n: number) {
      assert(
        typeof actual === 'number' && actual < n,
        `${actual} to be less than ${n}`,
        `< ${n}`,
      );
    },

    toBeGreaterThanOrEqual(n: number) {
      assert(
        typeof actual === 'number' && actual >= n,
        `${actual} to be greater than or equal to ${n}`,
        `>= ${n}`,
      );
    },

    toBeLessThanOrEqual(n: number) {
      assert(
        typeof actual === 'number' && actual <= n,
        `${actual} to be less than or equal to ${n}`,
        `<= ${n}`,
      );
    },
  };

  return chain;
}
