import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';

import * as schema from '@/db/schema';

import { createTestDb } from '../helpers/db';

const now = '2026-10-18T08:00:00.000Z';

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
