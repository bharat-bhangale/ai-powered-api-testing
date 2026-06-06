import { z } from 'zod';

/**
 * Zod schemas for IPC payloads.
 *
 * Every payload travelling between main ↔ renderer is validated
 * with these schemas to prevent shape mismatches and injection.
 */

// ===== App Lifecycle =====

/** Response for CHANNEL_GET_RUNTIME_INFO */
export const RuntimeInfoSchema = z.object({
  appVersion: z.string(),
  electronVersion: z.string(),
  chromeVersion: z.string(),
  nodeVersion: z.string(),
  platform: z.enum(['win32', 'darwin', 'linux']),
  arch: z.string(),
  isPackaged: z.boolean(),
});

export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;

/** Response for CHANNEL_GET_API_BASE_URL */
export const ApiBaseUrlSchema = z.object({
  /** Full URL string, e.g. "http://127.0.0.1:PORT". Empty string when not ready. */
  url: z.string(),
  ready: z.boolean(),
});

export type ApiBaseUrl = z.infer<typeof ApiBaseUrlSchema>;

/** One-shot payload sent via CHANNEL_SERVER_READY once the health check passes */
export const ServerReadyPayloadSchema = z.object({
  url: z.string(),
  port: z.number(),
});

export type ServerReadyPayload = z.infer<typeof ServerReadyPayloadSchema>;

// ===== Server Status =====

export const ServerStatusSchema = z.object({
  status: z.enum(['starting', 'ready', 'error', 'stopped']),
  port: z.number().optional(),
  error: z.string().optional(),
});

export type ServerStatus = z.infer<typeof ServerStatusSchema>;

// ===== File Dialogs =====

export const FileOpenOptionsSchema = z.object({
  title: z.string().optional(),
  filters: z
    .array(
      z.object({
        name: z.string(),
        extensions: z.array(z.string()),
      }),
    )
    .optional(),
  multiple: z.boolean().optional(),
});

export type FileOpenOptions = z.infer<typeof FileOpenOptionsSchema>;

export const FileOpenResultSchema = z.object({
  cancelled: z.boolean(),
  filePaths: z.array(z.string()),
  /** File contents read as UTF-8 text, keyed by file path */
  fileContents: z.record(z.string(), z.string()).optional(),
});

export type FileOpenResult = z.infer<typeof FileOpenResultSchema>;

export const FileSaveOptionsSchema = z.object({
  title: z.string().optional(),
  defaultPath: z.string().optional(),
  filters: z
    .array(
      z.object({
        name: z.string(),
        extensions: z.array(z.string()),
      }),
    )
    .optional(),
  data: z.string(),
});

export type FileSaveOptions = z.infer<typeof FileSaveOptionsSchema>;

export const FileSaveResultSchema = z.object({
  cancelled: z.boolean(),
  filePath: z.string().optional(),
});

export type FileSaveResult = z.infer<typeof FileSaveResultSchema>;

// ===== Window Actions =====

export const WindowActionSchema = z.enum(['minimize', 'maximize', 'close']);

export type WindowAction = z.infer<typeof WindowActionSchema>;
