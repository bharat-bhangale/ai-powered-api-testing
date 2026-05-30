import { z } from 'zod';

// ===== Request Context Schema =====

const requestContextSchema = z.object({
  method: z.string(),
  url: z.string(),
  headers: z.record(z.string()).default({}),
  body: z.unknown().optional(),
});

// ===== Response Context Schema =====

const responseContextSchema = z.object({
  status: z.number(),
  statusText: z.string().default(''),
  headers: z.record(z.string()).default({}),
  body: z.unknown().optional(),
  size: z.number().default(0),
  timing: z.object({
    total: z.number(),
  }),
});

// ===== Execute Test Script Schema =====

/**
 * Schema for POST /api/test-runner/execute
 */
export const executeTestSchema = z.object({
  /** The JavaScript test script to execute */
  script: z.string().min(1, 'Test script is required'),
  /** The request that was sent */
  request: requestContextSchema,
  /** The response that was received */
  response: responseContextSchema,
  /** Optional environment variables to seed atx.variables */
  variables: z.record(z.string()).optional(),
});

export type ExecuteTestBody = z.infer<typeof executeTestSchema>;
