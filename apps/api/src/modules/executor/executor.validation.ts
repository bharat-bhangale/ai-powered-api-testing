import { z } from 'zod';

const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const keyValuePairSchema = z.object({
  id: z.string().optional(),
  key: z.string(),
  value: z.string().default(''),
  description: z.string().optional().default(''),
  enabled: z.boolean().optional().default(true),
});

const requestBodySchema = z.object({
  mode: z.enum(['none', 'json', 'form-data', 'urlencoded', 'raw', 'binary', 'graphql']).default('none'),
  content: z.string().default(''),
  contentType: z.string().optional(),
});

const authConfigSchema = z.object({
  type: z.enum(['none', 'apikey', 'bearer', 'basic']).default('none'),
  apiKey: z
    .object({
      key: z.string(),
      value: z.string(),
      addTo: z.enum(['header', 'query']),
    })
    .optional(),
  bearer: z
    .object({
      token: z.string(),
    })
    .optional(),
  basic: z
    .object({
      username: z.string(),
      password: z.string(),
    })
    .optional(),
});

export const executeRequestSchema = z.object({
  method: httpMethodSchema,
  url: z.string().trim().min(1, 'URL is required'),
  headers: z.array(keyValuePairSchema).default([]),
  params: z.array(keyValuePairSchema).default([]),
  body: requestBodySchema.default({ mode: 'none', content: '' }),
  auth: authConfigSchema.default({ type: 'none' }),
  environmentId: z.string().nullable().optional(),
  timeout: z.number().int().min(1_000).max(120_000).optional(),
});

export type ExecuteRequestBody = z.infer<typeof executeRequestSchema>;
