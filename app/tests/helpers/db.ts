import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import * as schema from '@/db/schema';
import type { ServiceContext } from '@/services/context';

const migrationsFolder = fileURLToPath(new URL('../../src/db/migrations', import.meta.url));

/** Opens a database (in memory by default) and applies the app's migrations. */
export function createTestDb(filename = ':memory:') {
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return { sqlite, db };
}

/** A service context whose clock can be moved forward with `advance(ms)`. */
export function createTestContext(filename?: string) {
  const { sqlite, db } = createTestDb(filename);
  let time = Date.parse('2026-10-25T08:00:00.000Z');
  const ctx: ServiceContext = {
    db,
    now: () => new Date(time),
    newId: () => randomUUID(),
  };
  return {
    ctx,
    sqlite,
    advance: (ms = 1000) => {
      time += ms;
    },
  };
}
