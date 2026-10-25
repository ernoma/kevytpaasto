import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from '@/db/schema';

/**
 * Any synchronous SQLite database with the app schema: expo-sqlite in the app,
 * better-sqlite3 in tests. Transactions of it are accepted as well.
 */
export type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** Dependencies of the service layer, injected so that tests control time and ids. */
export interface ServiceContext {
  db: Db;
  now: () => Date;
  /** Returns a new UUID for rows created by the services themselves. */
  newId: () => string;
}

/** UTC ISO 8601 timestamp for created_at and updated_at columns. */
export function timestamp(ctx: ServiceContext): string {
  return ctx.now().toISOString();
}
