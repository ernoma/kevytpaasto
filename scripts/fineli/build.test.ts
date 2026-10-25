// HAK-02, HAK-04, LAS-01, LAS-06: conversion of the Fineli package into fineli.db.
import Database from 'better-sqlite3';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { buildFineliDb, readPackage, releaseFromDescription } from './build.ts';

const fixture = join(import.meta.dirname, 'fixture');

describe('buildFineliDb', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fineli-'));
  const output = join(dir, 'fineli.db');
  let db: Database.Database;
  const food = (id: number) =>
    db.prepare('SELECT * FROM fineli_food WHERE id = ?').get(id) as Record<string, unknown>;

  before(() => {
    const files = readPackage(fixture);
    const result = buildFineliDb(files, output, {
      release: releaseFromDescription(files) ?? '',
      year: '2099',
      packageName: 'fixture',
      convertedAt: '2026-10-25T00:00:00.000Z',
    });
    assert.deepEqual(result, { foods: 8, missingEnergy: 1, units: 8, energyUnit: 'KJ' });
    db = new Database(output, { readonly: true });
  });

  after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads the release number from descript.txt', () => {
    assert.equal(releaseFromDescription(readPackage(fixture)), '99.0');
  });

  it('LAS-01: converts kJ to kcal by dividing by 4.184 without rounding', () => {
    const apple = food(1);
    assert.equal(apple.energy_kj_per_100g, 171.544);
    assert.equal(apple.energy_kcal_per_100g, 171.544 / 4.184);
  });

  it('HAK-04: stores missing energy as null, not 0', () => {
    const water = food(4);
    assert.equal(water.energy_kj_per_100g, null);
    assert.equal(water.energy_kcal_per_100g, null);
  });

  it('shows upper-case names in sentence case and keeps lower-case search text', () => {
    assert.equal(food(1).name_fi, 'Omena, kotimainen, kuorittu');
    assert.equal(food(7).name_fi, 'Äyriäiskeitto');
    assert.equal(food(7).search_text, 'äyriäiskeitto');
  });

  it('LAS-06: stores the preparation method and state', () => {
    assert.equal(food(1).preparation_state, 'raw');
    assert.equal(food(3).preparation_state, 'cooked');
    assert.equal(food(3).process_fi, 'Keitetty');
    assert.equal(food(2).preparation_state, 'prepared');
    assert.equal(food(8).preparation_state, 'unprepared');
  });

  it('stores household units with their mass', () => {
    const units = db
      .prepare('SELECT unit, mass_g FROM fineli_food_unit WHERE food_id = 3 ORDER BY unit')
      .all();
    assert.deepEqual(units, [
      { unit: 'DL', mass_g: 100 },
      { unit: 'PORTM', mass_g: 250 },
      { unit: 'PORTS', mass_g: 150 },
    ]);
  });

  it('HAK-02: indexes names for prefix search, also with ä and ö', () => {
    const search = (query: string) =>
      (
        db
          .prepare('SELECT rowid FROM fineli_food_fts WHERE fineli_food_fts MATCH ? ORDER BY rowid')
          .all(query) as { rowid: number }[]
      ).map((r) => r.rowid);
    assert.deepEqual(search('"omen"*'), [1, 2]);
    assert.deepEqual(search('"banaani"* "kuorittu"*'), [5]);
    assert.deepEqual(search('"äyri"*'), [7]);
  });

  it('records the source, licence and release', () => {
    const meta = Object.fromEntries(
      (db.prepare('SELECT key, value FROM meta').all() as { key: string; value: string }[]).map(
        (r) => [r.key, r.value],
      ),
    );
    assert.equal(meta.license, 'CC BY 4.0');
    assert.equal(meta.release, '99.0');
    assert.equal(meta.year, '2099');
    assert.equal(meta.converted_at, '2026-10-25T00:00:00.000Z');
  });
});
