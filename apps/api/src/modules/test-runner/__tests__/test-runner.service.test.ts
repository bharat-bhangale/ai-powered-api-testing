import { describe, it, expect } from 'vitest';
import { TestRunnerService } from '../test-runner.service';

const service = new TestRunnerService();

// ===== Helper =====

const mockRequest = { method: 'GET', url: 'https://api.example.com/users', headers: {}, body: undefined };
const mockResponse = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: { data: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }], total: 2 },
  size: 120,
  timing: { total: 45 },
};

// ===== Tests =====

describe('TestRunnerService', () => {
  it('should run a passing test', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Status is 200", () => {
          atx.expect(atx.response.status).toBe(200);
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(1);
    expect(result.totalFailed).toBe(0);
    expect(result.tests[0].name).toBe('Status is 200');
    expect(result.tests[0].passed).toBe(true);
  });

  it('should run a failing test', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Status is 404", () => {
          atx.expect(atx.response.status).toBe(404);
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(0);
    expect(result.totalFailed).toBe(1);
    expect(result.tests[0].passed).toBe(false);
    expect(result.tests[0].error).toBeTruthy();
  });

  it('should run multiple tests — some pass, some fail', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Status is 200", () => {
          atx.expect(atx.response.status).toBe(200);
        });
        atx.test("Body is array", () => {
          atx.expect(atx.response.json().data).toBeArray();
        });
        atx.test("Has 10 items", () => {
          atx.expect(atx.response.json().data).toHaveLength(10);
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(2);
    expect(result.totalFailed).toBe(1);
    expect(result.tests).toHaveLength(3);
  });

  it('should support .not negation', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Status is not 500", () => {
          atx.expect(atx.response.status).not.toBe(500);
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(1);
    expect(result.totalFailed).toBe(0);
  });

  it('should support toHaveProperty', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Body has total", () => {
          atx.expect(atx.response.json()).toHaveProperty("total");
        });
        atx.test("Total is 2", () => {
          atx.expect(atx.response.json()).toHaveProperty("total", 2);
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(2);
    expect(result.totalFailed).toBe(0);
  });

  it('should support response timing assertions', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Response time under 500ms", () => {
          atx.expect(atx.response.timing.total).toBeLessThan(500);
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(1);
  });

  it('should support toContain on arrays', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Contains John", () => {
          const names = atx.response.json().data.map(u => u.name);
          atx.expect(names).toContain("John");
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(1);
  });

  it('should collect atx.log() messages', async () => {
    const result = await service.runTests({
      script: `
        atx.log("Starting tests");
        atx.test("Passes", () => {
          atx.log("Inside test");
          atx.expect(true).toBeTruthy();
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.logs).toContain('Starting tests');
    expect(result.logs).toContain('Inside test');
  });

  it('should support atx.variables.get/set', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Read seeded variable", () => {
          atx.expect(atx.variables.get("baseUrl")).toBe("https://api.example.com");
        });
        atx.variables.set("newVar", "hello");
        atx.test("Read set variable", () => {
          atx.expect(atx.variables.get("newVar")).toBe("hello");
        });
      `,
      request: mockRequest,
      response: mockResponse,
      variables: { baseUrl: 'https://api.example.com' },
    });

    expect(result.totalPassed).toBe(2);
    expect(result.totalFailed).toBe(0);
  });

  it('should return error for empty script', async () => {
    const result = await service.runTests({
      script: '',
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.tests).toHaveLength(0);
    expect(result.error).toBe('No test script provided');
  });

  it('should handle script syntax errors gracefully', async () => {
    const result = await service.runTests({
      script: 'this is not valid javascript {{{',
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.error).toBeTruthy();
    expect(result.error).toContain('Script error');
  });

  it('should isolate sandbox — no access to process', async () => {
    const result = await service.runTests({
      script: `
        atx.test("No process access", () => {
          let hasProcess = false;
          try { hasProcess = typeof process !== 'undefined'; } catch { hasProcess = false; }
          atx.expect(hasProcess).toBeFalsy();
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(1);
  });

  it('should support toMatch regex', async () => {
    const result = await service.runTests({
      script: `
        atx.test("Content-Type contains json", () => {
          atx.expect(atx.response.headers["content-type"]).toMatch(/json/);
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.totalPassed).toBe(1);
  });

  it('should continue running tests after a failure', async () => {
    const result = await service.runTests({
      script: `
        atx.test("First - passes", () => {
          atx.expect(true).toBeTruthy();
        });
        atx.test("Second - fails", () => {
          atx.expect(false).toBeTruthy();
        });
        atx.test("Third - passes", () => {
          atx.expect(1).toBe(1);
        });
      `,
      request: mockRequest,
      response: mockResponse,
    });

    expect(result.tests).toHaveLength(3);
    expect(result.tests[0].passed).toBe(true);
    expect(result.tests[1].passed).toBe(false);
    expect(result.tests[2].passed).toBe(true);
    expect(result.totalPassed).toBe(2);
    expect(result.totalFailed).toBe(1);
  });
});
