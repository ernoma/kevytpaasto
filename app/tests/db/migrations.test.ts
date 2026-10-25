import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

import * as schema from '@/db/schema';

import { createTestDb } from '../helpers/db';

const now = '2026-10-18T08:00:00.000Z';
const migrationsDir = fileURLToPath(new URL('../../src/db/migrations', import.meta.url));

describe('database migrations', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof createTestDb>['db'];

  beforeEach(() => {
    ({ sqlite, db } = createTestDb());
  });

  it('creates all tables from the implementation plan', () => {
    const tables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name",
      )
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual([
      'fast_day',
      'food',
      'log_entry',
      'meal',
      'meal_item',
      'publish_job',
      'settings',
    ]);
  });

  it('PAI-05: stores fast day date as YYYY-MM-DD and rejects other formats', () => {
    db.insert(schema.fastDay)
      .values({ id: 'd1', date: '2026-10-18', limitKcal: 600, createdAt: now })
      .run();
    expect(() =>
      db
        .insert(schema.fastDay)
        .values({ id: 'd2', date: '2026-10-18T00:00:00Z', limitKcal: 600, createdAt: now })
        .run(),
    ).toThrow();
  });

  it('HAK-04: keeps missing food energy as null, not 0', () => {
    db.insert(schema.food)
      .values({ id: 'f1', source: 'off', name: 'Tuote', createdAt: now, updatedAt: now })
      .run();
    const row = db.select().from(schema.food).get();
    expect(row?.energyKcal).toBeNull();
  });

  it('LAS-04: rejects negative energy', () => {
    expect(() =>
      db
        .insert(schema.food)
        .values({
          id: 'f2',
          source: 'user',
          name: 'Virhe',
          energyKcal: -1,
          energyBasis: 'per_100g',
          createdAt: now,
          updatedAt: now,
        })
        .run(),
    ).toThrow();
  });

  it('KIR-08: 0001 keeps existing entries and adds an empty serving snapshot', () => {
    const upgraded = new Database(':memory:');
    upgraded.pragma('foreign_keys = ON');
    const runMigration = (file: string) => {
      for (const statement of readFileSync(join(migrationsDir, file), 'utf8').split(
        '--> statement-breakpoint',
      )) {
        upgraded.exec(statement);
      }
    };
    runMigration('0000_init.sql');
    upgraded.exec(`
      INSERT INTO fast_day VALUES ('d1', '2026-10-18', 600, '${now}');
      INSERT INTO log_entry (id, fast_day_id, created_at, updated_at, name, amount, unit, kcal, origin_type)
        VALUES ('e1', 'd1', '${now}', '${now}', 'Kahvi', 120, 'kcal', 120, 'quick');
    `);
    runMigration('0001_log_entry_serving.sql');
    expect(upgraded.prepare("SELECT * FROM log_entry WHERE id = 'e1'").get()).toMatchObject({
      name: 'Kahvi',
      amount: 120,
      kcal: 120,
      serving_amount: null,
      serving_unit: null,
      serving_label: null,
    });
    expect(() =>
      upgraded.exec("UPDATE log_entry SET serving_unit = 'kpl' WHERE id = 'e1'"),
    ).toThrow();
  });

  it('PAI-06: a fast day with entries cannot be deleted without deleting the entries first', () => {
    db.insert(schema.fastDay)
      .values({ id: 'd1', date: '2026-10-18', limitKcal: 600, createdAt: now })
      .run();
    db.insert(schema.logEntry)
      .values({
        id: 'e1',
        fastDayId: 'd1',
        createdAt: now,
        updatedAt: now,
        amount: 120,
        unit: 'kcal',
        kcal: 120,
        originType: 'quick',
      })
      .run();
    expect(() => sqlite.prepare("DELETE FROM fast_day WHERE id = 'd1'").run()).toThrow();
  });
});
