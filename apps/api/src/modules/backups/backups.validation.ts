import { z } from 'zod';

export const exportBackupSchema = z.object({
  targetPath: z.string().optional(),
});

export const importBackupSchema = z.object({
  manifest: z.object({
    version: z.string(),
    createdAt: z.string(),
    collections: z.array(z.any()),
    environments: z.array(z.any()),
    settings: z.record(z.string()).optional(),
  }),
});
