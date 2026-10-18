// Converts the Fineli open data package (zip or extracted folder) into fineli.db (docs/adr/0003).
//
// Usage (repo root):
//   node scripts/fineli/convert.ts <package.zip | folder> [output.db] [--release "Release 20"]
//
// The package must be downloaded manually from https://fineli.fi/fineli/fi/avoin-data because
// fineli.fi blocks automated downloads. Licence: CC BY 4.0, source THL / Fineli.
import Database from 'better-sqlite3';
import { unzipSync } from 'fflate';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { kjToKcal } from '../../app/src/domain/energy.ts';
import { decodeText, parseCsv, parseDecimal } from './csv.ts';

type Files = Map<string, Uint8Array>;

function readPackage(input: string): Files {
  const files: Files = new Map();
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

const encodings = new Map<string, string>();

function table(files: Files, name: string, required = true): Record<string, string>[] {
  const bytes = files.get(name.toLowerCase());
  if (bytes === undefined) {
    if (required)
      throw new Error(`Missing ${name} in package. Found: ${[...files.keys()].join(', ')}`);
    return [];
  }
  const { text, encoding } = decodeText(bytes);
  encodings.set(name, encoding);
  return parseCsv(text);
}

function classification(files: Files, name: string): Map<string, string> {
  return new Map(table(files, name, false).map((r) => [r.THSCODE ?? '', r.DESCRIPT ?? '']));
}

function main() {
  const args = process.argv.slice(2);
  const releaseIndex = args.indexOf('--release');
  const release = releaseIndex >= 0 ? (args[releaseIndex + 1] ?? '') : '';
  const positional = args.filter((_, i) => i !== releaseIndex && i !== releaseIndex + 1);
  const [input, outputArg] = positional;
  if (input === undefined) {
    console.error(
      'Usage: node scripts/fineli/convert.ts <package.zip | folder> [output.db] [--release "Release 20"]',
    );
    process.exit(1);
  }
  const output = resolve(outputArg ?? join(dirname(resolve(input)), 'fineli.db'));

  const files = readPackage(resolve(input));
  console.log(`Package files: ${[...files.keys()].sort().join(', ')}`);

  const foods = table(files, 'food.csv');
  const namesFi = new Map(
    table(files, 'foodname_FI.csv').map((r) => [r.FOODID ?? '', r.FOODNAME ?? '']),
  );
  const components = table(files, 'component_value.csv');
  const units = table(files, 'foodaddunit.csv', false);
  const processFi = classification(files, 'process_FI.csv');
  const foodTypeFi = classification(files, 'foodtype_FI.csv');
  const foodUnitFi = classification(files, 'foodunit_FI.csv');
  const componentInfo = new Map(
    table(files, 'component.csv', false).map((r) => [r.EUFDNAME ?? '', r.COMPUNIT ?? '']),
  );
  console.log(`Encodings: ${[...encodings].map(([f, e]) => `${f}=${e}`).join(', ')}`);
  console.log(`ENERC unit in component.csv: ${componentInfo.get('ENERC') ?? '(not found)'}`);

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
      energy_kj_per_100g REAL,
      energy_kcal_per_100g REAL,
      food_type TEXT,
      food_type_fi TEXT,
      process TEXT,
      process_fi TEXT,
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
    `INSERT INTO fineli_food (id, name_fi, energy_kj_per_100g, energy_kcal_per_100g, food_type,
       food_type_fi, process, process_fi, edible_portion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      insertFood.run(
        Number(id),
        namesFi.get(id) || f.FOODNAME || '',
        kj,
        kj === null ? null : kjToKcal(kj),
        f.FOODTYPE || null,
        foodTypeFi.get(f.FOODTYPE ?? '') ?? null,
        f.PROCESS || null,
        processFi.get(f.PROCESS ?? '') ?? null,
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
  insertMeta.run('package', basename(resolve(input)));
  insertMeta.run('release', release);
  insertMeta.run('converted_at', new Date().toISOString());
  insertMeta.run('food_count', String(foods.length));
  db.exec('VACUUM;');
  db.close();

  console.log(
    `Foods: ${foods.length}, missing energy: ${missingEnergy}, serving units: ${units.length}`,
  );
  console.log(`Wrote ${output} (${(statSync(output).size / 1024 / 1024).toFixed(2)} MB)`);
}

main();
