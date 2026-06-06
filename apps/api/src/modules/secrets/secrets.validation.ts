import { z } from 'zod';

export const CreateSecretSchema = z.object({
  scope: z.string(),
  label: z.string(),
  value: z.string(),
});
