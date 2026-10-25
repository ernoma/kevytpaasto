import type Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFineliDb, readPackage } from '../../../scripts/fineli/build.ts';

const fixtureDir = fileURLToPath(new URL('../../../scripts/fineli/fixture', import.meta.url));
let fixtureDb: string | null = null;

/** fineli.db built from the invented test package in scripts/fineli/fixture, once per run. */
function fixturePath(): string {
  if (fixtureDb === null) {
    const path = join(mkdtempSync(join(tmpdir(), 'fineli-test-')), 'fineli.db');
    buildFineliDb(readPackage(fixtureDir), path, {
      release: '99.0',
      year: '2099',
      packageName: 'fixture',
      convertedAt: '2026-10-25T00:00:00.000Z',
    });
    fixtureDb = path;
  }
  return fixtureDb;
}

/** Attaches the fixture as the app does with the real fineli.db (src/db/fineli.ts). */
export function attachFineliFixture(sqlite: Database.Database): void {
  sqlite.prepare('ATTACH DATABASE ? AS fineli').run(fixturePath());
}
