import vm from 'node:vm';
import type { AtxGlobal, TestResult } from './atx-api';

// ===== Types =====

export interface SandboxResult {
  tests: TestResult[];
  logs: string[];
  error?: string;
  duration: number;
}

// ===== Constants =====

/** Maximum execution time for a test script (ms) */
const SANDBOX_TIMEOUT_MS = 5_000;

// ===== Sandbox Execution =====

/**
 * Executes a test script inside a Node.js vm sandbox.
 *
 * The sandbox provides ONLY the `atx` global — no access to
 * process, require, fs, Buffer, setTimeout, or any Node.js API.
 *
 * @param script - The JavaScript test script string
 * @param atx    - The built atx global object
 * @param collected - The mutable collector that atx.test() writes to
 * @returns SandboxResult with test results, logs, and optional error
 */
export function executeSandbox(
  script: string,
  atx: AtxGlobal,
  collected: { tests: TestResult[]; logs: string[] },
): SandboxResult {
  const startTime = Date.now();

  // Build a minimal, isolated context — only `atx` is available
  const contextObject: Record<string, unknown> = {
    atx,
    // Provide console.log as an alias for atx.log
    console: Object.freeze({
      log: (...args: unknown[]) => {
        const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        collected.logs.push(msg);
      },
      warn: (...args: unknown[]) => {
        const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        collected.logs.push(`[warn] ${msg}`);
      },
      error: (...args: unknown[]) => {
        const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        collected.logs.push(`[error] ${msg}`);
      },
    }),
  };

  const context = vm.createContext(contextObject, {
    name: 'atx-test-sandbox',
    // Prevent the sandbox from accessing the outer global
    codeGeneration: { strings: false, wasm: false },
  });

  try {
    vm.runInContext(script, context, {
      timeout: SANDBOX_TIMEOUT_MS,
      filename: 'test-script.js',
      displayErrors: true,
      breakOnSigint: true,
    });

    return {
      tests: collected.tests,
      logs: collected.logs,
      duration: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Detect timeout specifically
    const isTimeout =
      err.message.includes('Script execution timed out') ||
      err.message.includes('timed out');

    return {
      tests: collected.tests,
      logs: collected.logs,
      error: isTimeout
        ? `Script execution timed out after ${SANDBOX_TIMEOUT_MS}ms`
        : `Script error: ${err.message}`,
      duration: Date.now() - startTime,
    };
  }
}
