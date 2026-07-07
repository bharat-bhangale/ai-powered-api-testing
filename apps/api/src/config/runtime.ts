import { z } from 'zod';

/**
 * Runtime configuration for the ATX API server.
 *
 * ATX_RUNTIME_MODE controls which startup path the server takes:
 *   - "web"     (default) — full Express + MongoDB setup for browser clients
 *   - "desktop" — lightweight mode started by Electron, no MongoDB required
 *
 * In desktop mode the server:
 *   - Binds to 127.0.0.1 only
 *   - Accepts port 0 so the OS picks a free port
 *   - Sends a { type: 'ready', port } IPC message to the parent process
 *   - Skips MongoDB connection (SQLite will be wired up in a later phase)
 */

const RuntimeConfigSchema = z.object({
  ATX_RUNTIME_MODE: z
    .enum(['web', 'desktop'])
    .default('web')
    .describe('Controls which startup path the API server uses'),
});

const parsed = RuntimeConfigSchema.safeParse({
  ATX_RUNTIME_MODE: process.env['ATX_RUNTIME_MODE'],
});

if (!parsed.success) {
  console.error('❌ Invalid ATX_RUNTIME_MODE:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const runtimeConfig = parsed.data;

/** True when the server is started by the Electron desktop app. */
export const isDesktopMode = runtimeConfig.ATX_RUNTIME_MODE === 'desktop';
