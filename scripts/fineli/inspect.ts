// Prints spot checks and search timings for a converted fineli.db (docs/adr/0003).
//
// Usage (repo root): node scripts/fineli/inspect.ts [fineli.db] [search terms...]
import Database from 'better-sqlite3';
import { resolve } from 'node:path';

const DEFAULT_TERMS = [
  'kaurapuuro',
  'omena',
  'banaani',
  'maito',
  'ruisleipä',
  'kananmuna',
  'peruna',
  'riisi',
  'broileri',
  'jogurtti',
];

const [dbArg, ...terms] = process.argv.slice(2);
const db = new Database(resolve(dbArg ?? 'app/assets/fineli/fineli.db'), { readonly: true });

for (const row of db.prepare('SELECT key, value FROM meta').all() as {
  key: string;
  value: string;
}[]) {
  console.log(`${row.key}: ${row.value}`);
}
console.log('Process classes:');
for (const row of db
  .prepare(
    'SELECT process, process_fi, COUNT(*) AS n FROM fineli_food GROUP BY process ORDER BY n DESC',
  )
  .all() as { process: string; process_fi: string; n: number }[]) {
  console.log(`  ${row.process} ${row.process_fi ?? ''}: ${row.n}`);
}

const search = db.prepare(
  `SELECT f.id, f.name_fi, f.energy_kcal_per_100g AS kcal, f.process_fi
   FROM fineli_food_fts s JOIN fineli_food f ON f.id = s.rowid
   WHERE fineli_food_fts MATCH ? ORDER BY rank LIMIT 5`,
);

for (const term of terms.length > 0 ? terms : DEFAULT_TERMS) {
  const query = term
    .split(/\s+/)
    .map((w) => `"${w.replace(/"/g, '')}"*`)
    .join(' ');
  const started = performance.now();
  const rows = search.all(query) as {
    id: number;
    name_fi: string;
    kcal: number | null;
    process_fi: string | null;
  }[];
  const ms = performance.now() - started;
  console.log(`\n${term} (${ms.toFixed(1)} ms)`);
  for (const r of rows) {
    const kcal = r.kcal === null ? 'energia puuttuu' : `${r.kcal.toFixed(0)} kcal/100 g`;
    console.log(`  ${r.id} ${r.name_fi} – ${kcal}${r.process_fi ? ` (${r.process_fi})` : ''}`);
  }
}
db.close();
