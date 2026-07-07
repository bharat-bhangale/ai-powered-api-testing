import { z } from 'zod';

export const SetSettingSchema = z.object({
  value: z.any(),
});
