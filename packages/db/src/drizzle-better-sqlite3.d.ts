// Declaration shim for drizzle-orm/better-sqlite3.
// drizzle-orm ships its own types but ts-node doesn't always resolve them
// correctly from .cjs bundles. This ambient declaration suppresses TS7016.
declare module 'drizzle-orm/better-sqlite3' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function drizzle(...args: any[]): any;
  export type BetterSQLite3Database<TSchema extends Record<string, unknown> = Record<string, never>> = any;
}
