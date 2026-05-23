import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment variable schema — validates at startup.
 * The app fails fast if any required variable is missing.
 */
const envSchema = z.object({
  PORT: z.string().default('8000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional(),
  ACCESS_TOKEN_SECRET: z.string().default('dev-access-secret-replace-in-prod-1234567890'),
  REFRESH_TOKEN_SECRET: z.string().default('dev-refresh-secret-replace-in-prod-1234567890'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  OPENAI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
