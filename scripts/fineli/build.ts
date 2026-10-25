// Builds fineli.db from the Fineli open data package (docs/adr/0003, plan section 3.2).
import Database from 'better-sqlite3';
import { unzipSync } from 'fflate';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { kjToKcal } from '../../app/src/domain/energy.ts';
import {
  fineliDisplayName,
  fineliPreparationState,
  searchText,
} from '../../app/src/domain/fineli.ts';
import { decodeText, parseCsv, parseDecimal } from './csv.ts';

/** Package files by lower-case file name. */
export type PackageFiles = Map<string, Uint8Array>;

/** Reads a zip package or an extracted folder. */
export function readPackage(input: string): PackageFiles {
  const files: PackageFiles = new Map();
  if (statSync(input).isDirectory()) {
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else files.set(name.toLowerCase(), readFileSync(path));
      }
    };
    walk(input);
  } else {
    for (const [path, bytes] of Object.entries(unzipSync(readFileSync(input)))) {
      if (!path.endsWith('/')) files.set(basename(path).toLowerCase(), bytes);
    }
  }
  return files;
}

function table(files: PackageFiles, name: string, required = true): Record<string, string>[] {
  const bytes = files.get(name.toLowerCase());
  if (bytes === undefined) {
    if (required)
      throw new Error(`Missing ${name} in package. Found: ${[...files.keys()].join(', ')}`);
    return [];
  }
  return parseCsv(decodeText(bytes).text);
}

function classification(files: PackageFiles, name: string): Map<string, string> {
  return new Map(table(files, name, false).map((r) => [r.THSCODE ?? '', r.DESCRIPT ?? '']));
}

/** Release number from descript.txt ("Versio. Version. Release. 20.0"), or null. */
export function releaseFromDescription(files: PackageFiles): string | null {
  const bytes = files.get('descript.txt');
  if (bytes === undefined) return null;
  const match = /Release\.\s*([0-9][0-9.]*)/.exec(decodeText(bytes).text);
  return match?.[1]?.replace(/\.$/, '') ?? null;
}

export interface BuildInfo {
  release: string;
  /** Publication year from the recommended citation, e.g. 2019 for Release 20. */
  year: string;
  packageName: string;
  convertedAt: string;
}

export interface BuildResult {
  foods: number;
  missingEnergy: number;
  units: number;
  energyUnit: string | null;
}

export function buildFineliDb(files: PackageFiles, output: string, info: BuildInfo): BuildResult {
  const foods = table(files, 'food.csv');
  const namesFi = new Map(
    table(files, 'foodname_FI.csv').map((r) => [r.FOODID ?? '', r.FOODNAME ?? '']),
  );
  const components = table(files, 'component_value.csv');
  const units = table(files, 'foodaddunit.csv', false);
  const processFi = classification(files, 'process_FI.csv');
  const foodTypeFi = classification(files, 'foodtype_FI.csv');
  const foodUnitFi = classification(files, 'foodunit_FI.csv');
  const energyUnit =
    table(files, 'component.csv', false).find((r) => r.EUFDNAME === 'ENERC')?.COMPUNIT ?? null;
  if (energyUnit !== null && energyUnit.toUpperCase() !== 'KJ') {
    throw new Error(`Expected ENERC in kJ, got ${energyUnit}`);
  }

  const energyKj = new Map<string, number | null>();
  for (const c of components) {
    if (c.EUFDNAME === 'ENERC') energyKj.set(c.FOODID ?? '', parseDecimal(c.BESTLOC));
  }

  if (existsSync(output)) rmSync(output);
  mkdirSync(dirname(output), { recursive: true });
  const db = new Database(output);
  db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE fineli_food (
      id INTEGER PRIMARY KEY,
      name_fi TEXT NOT NULL,
      search_text TEXT NOT NULL,
      energy_kj_per_100g REAL,
      energy_kcal_per_100g REAL,
      food_type TEXT,
      food_type_fi TEXT,
      process TEXT,
      process_fi TEXT,
      preparation_state TEXT,
      edible_portion REAL
    );
    CREATE TABLE fineli_food_unit (
      food_id INTEGER NOT NULL REFERENCES fineli_food(id),
      unit TEXT NOT NULL,
      unit_fi TEXT,
      mass_g REAL NOT NULL,
      PRIMARY KEY (food_id, unit)
    );
    CREATE VIRTUAL TABLE fineli_food_fts USING fts5(
      name_fi, content='fineli_food', content_rowid='id',
      tokenize="unicode61 remove_diacritics 0", prefix='2 3'
    );
  `);

  const insertFood = db.prepare(
    `INSERT INTO fineli_food (id, name_fi, search_text, energy_kj_per_100g, energy_kcal_per_100g,
       food_type, food_type_fi, process, process_fi, preparation_state, edible_portion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertUnit = db.prepare(
    'INSERT OR IGNORE INTO fineli_food_unit (food_id, unit, unit_fi, mass_g) VALUES (?, ?, ?, ?)',
  );

  let missingEnergy = 0;
  db.transaction(() => {
    for (const f of foods) {
      const id = f.FOODID ?? '';
      const kj = energyKj.get(id) ?? null;
      // Missing energy stays null, never 0 (HAK-04).
      if (kj === null) missingEnergy++;
      const name = fineliDisplayName(namesFi.get(id) || f.FOODNAME || '');
      insertFood.run(
        Number(id),
        name,
        searchText(name),
        kj,
        kj === null ? null : kjToKcal(kj),
        f.FOODTYPE || null,
        foodTypeFi.get(f.FOODTYPE ?? '') ?? null,
        f.PROCESS || null,
        processFi.get(f.PROCESS ?? '') ?? null,
        fineliPreparationState(f.PROCESS),
        parseDecimal(f.EDPORT),
      );
    }
    for (const u of units) {
      const mass = parseDecimal(u.MASS);
      if (mass === null) continue;
      insertUnit.run(Number(u.FOODID), u.FOODUNIT, foodUnitFi.get(u.FOODUNIT ?? '') ?? null, mass);
    }
  })();
  db.exec("INSERT INTO fineli_food_fts(fineli_food_fts) VALUES ('rebuild');");

  const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
  insertMeta.run('source', 'Fineli, Terveyden ja hyvinvoinnin laitos (THL)');
  insertMeta.run('license', 'CC BY 4.0');
  insertMeta.run('package', info.packageName);
  insertMeta.run('release', info.release);
  insertMeta.run('year', info.year);
  insertMeta.run('converted_at', info.convertedAt);
  insertMeta.run('food_count', String(foods.length));
  db.exec('VACUUM;');
  db.close();

  return { foods: foods.length, missingEnergy, units: units.length, energyUnit };
}
