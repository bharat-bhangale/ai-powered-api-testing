# Phase 2: Test Runner & Automation Context

## ATX Scripting API (atx global)
The test runner provides a sandboxed JS environment with `atx`:
- `atx.response` — { status, statusText, headers, json(), text(), timing: { total }, size }
- `atx.request` — { method, url, headers, body }
- `atx.expect(value)` — assertion chain: .toBe(), .toEqual(), .toBeArray(), .toContain(), .toHaveProperty(), .toMatch(), .toBeGreaterThan(), .toBeLessThan(), .toMatchSchema(), .toBeTruthy(), .toBeFalsy(), .toHaveLength(), .not (negation)
- `atx.test(name, fn)` — register a named test
- `atx.variables` — .get(name), .set(name, value)
- `atx.log(msg)` — log to test console

## Test Execution Flow
1. Request sent → response received
2. Test script parsed → atx context built with response data
3. Script executed in vm.createContext() sandbox (5s timeout)
4. Results collected: { tests: [{ name, passed, error?, duration }] }

## Chain Variables (Collection Runner)
- Syntax: {{chain.RequestName.body.path.to.field}}
- During collection run, each response is stored in chain context
- Chain vars resolve before variable resolution

## New Models
- TestRun: stores collection run results (trigger, status, results[], summary)
- Schedule: stores cron schedules (cron, enabled, lastRun, nextRun)
- Request model gains: testScript (string), preRequestScript (string)

## New Backend Modules
- test-runner/ — sandbox execution, assertion library
- collection-runner/ — sequential collection execution with SSE progress
- schedules/ — cron worker for scheduled runs
- test-runs/ — test run history storage
- ai/features/ additions: coverage-analyzer, schema-validator, doc-generator
