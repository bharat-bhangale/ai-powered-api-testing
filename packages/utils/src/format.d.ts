/**
 * Formats bytes into a human-readable string (B, KB, MB, GB).
 */
export declare function formatBytes(bytes: number): string;
/**
 * Formats milliseconds into a human-readable duration string.
 */
export declare function formatDuration(ms: number): string;
/**
 * Formats a date into a relative time string (e.g., "2 min ago", "Yesterday").
 */
export declare function formatRelativeTime(date: Date | string): string;
