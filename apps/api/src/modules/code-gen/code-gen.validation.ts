import { z } from 'zod';

export const GenerateCodeSchema = z.object({
  target: z.enum(['curl', 'javascript-fetch', 'python-requests', 'go-nethttp']),
  request: z.object({
    method: z.string(),
    url: z.string(),
    headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    params: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    body: z.any().optional(),
    auth: z.any().optional(),
  }),
  redactSecrets: z.boolean().optional().default(true),
});
