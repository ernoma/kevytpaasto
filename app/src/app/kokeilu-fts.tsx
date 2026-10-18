// Phase 0 experiment: is SQLite FTS5 available in expo-sqlite on the phone, and how fast is a
// prefix search over a Fineli-sized table (docs/adr/0003)? Remove when phase 3 adds Fineli search.
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Stack, useTheme } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { strings } from '@/ui/strings.fi';

const t = strings.ftsExperiment;

const QUERIES = ['kaura', 'omena', 'ruisleipä', 'peruna keitetty', 'riisi', 'kananmuna'];
const ROWS = 4200;
const STEP_TIMEOUT_MS = 20_000;

// Synthetic Fineli-like names generated in SQL, so no prepared statements stay open.
const INSERT_ROWS = `
  WITH RECURSIVE
    heads(n, word) AS (VALUES (0,'Kaurapuuro'),(1,'Omena'),(2,'Banaani'),(3,'Maito'),
                              (4,'Ruisleipä'),(5,'Kananmuna'),(6,'Peruna'),(7,'Riisi')),
    parts(n, word) AS (VALUES (0,'keitetty'),(1,'kuorittu'),(2,'paistettu'),(3,'suolaa'),
                              (4,'suolaton'),(5,'kotimainen'),(6,'täysjyvä')),
    seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < ${ROWS})
  INSERT INTO fineli_food (id, name_fi)
  SELECT i, h.word || ', ' || p1.word || ', ' || p2.word || ' ' || i
  FROM seq
  JOIN heads h ON h.n = i % 8
  JOIN parts p1 ON p1.n = i % 7
  JOIN parts p2 ON p2.n = (i * 3) % 7`;

type Report = (lines: string[]) => void;

function toMatchQuery(term: string): string {
  return term
    .split(/\s+/)
    .map((w) => `"${w.replace(/"/g, '')}"*`)
    .join(' ');
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`aikakatkaisu ${STEP_TIMEOUT_MS / 1000} s`)),
      STEP_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Collects result lines and shows progress on screen and in the Metro console as it goes. */
class Progress {
  readonly lines: string[] = [];
  constructor(private readonly report: Report) {}

  push(line: string) {
    console.log(`[kokeilu-fts] ${line}`);
    this.lines.push(line);
    this.report([...this.lines]);
  }

  async step(label: string, fn: () => Promise<string | void>): Promise<boolean> {
    console.log(`[kokeilu-fts] … ${label}`);
    this.report([...this.lines, `… ${label}`]);
    const started = Date.now();
    try {
      const result = await withTimeout(fn());
      this.push(`✓ ${label}${result ? `: ${result}` : ''} (${Date.now() - started} ms)`);
      return true;
    } catch (error) {
      this.push(`✗ ${label}: ${message(error)} (${Date.now() - started} ms)`);
      return false;
    }
  }
}

async function runChecks(db: SQLiteDatabase, p: Progress): Promise<void> {
  await p.step('sqlite_version', async () => {
    const row = await db.getFirstAsync<{ v: string }>('SELECT sqlite_version() AS v');
    return t.sqliteVersion(row?.v ?? '?');
  });
  await p.step('compile_options (FTS)', async () => {
    const rows = await db.getAllAsync<{ compile_options: string }>('PRAGMA compile_options');
    const fts = rows.map((r) => r.compile_options).filter((o) => o.includes('FTS'));
    return fts.length > 0 ? fts.join(', ') : '–';
  });
  await p.step('CREATE TABLE', async () => {
    await db.execAsync('CREATE TABLE fineli_food (id INTEGER PRIMARY KEY, name_fi TEXT NOT NULL)');
  });
  const plainFts = await p.step('fts5 (oletusasetukset)', async () => {
    await db.execAsync('CREATE VIRTUAL TABLE plain_fts USING fts5(name)');
  });
  if (!plainFts) {
    p.push(t.ftsFailed);
    return;
  }
  // Same table definition as scripts/fineli/convert.ts.
  const ftsOk = await p.step('fts5 (unicode61, prefix)', async () => {
    await db.execAsync(
      `CREATE VIRTUAL TABLE fineli_food_fts USING fts5(
         name_fi, content='fineli_food', content_rowid='id',
         tokenize="unicode61 remove_diacritics 0", prefix='2 3')`,
    );
  });
  if (!ftsOk) return;

  const inserted = await p.step(`${ROWS} rivin lisäys`, async () => {
    await db.execAsync(INSERT_ROWS);
  });
  if (!inserted) return;
  const indexed = await p.step('indeksointi (rebuild)', async () => {
    await db.execAsync("INSERT INTO fineli_food_fts(fineli_food_fts) VALUES ('rebuild')");
  });
  if (!indexed) return;

  for (const term of QUERIES) {
    await p.step(`haku ”${term}”`, async () => {
      const queryStarted = performance.now();
      const rows = await db.getAllAsync(
        `SELECT f.id, f.name_fi FROM fineli_food_fts s JOIN fineli_food f ON f.id = s.rowid
         WHERE fineli_food_fts MATCH ? ORDER BY rank LIMIT 20`,
        [toMatchQuery(term)],
      );
      const ms = (performance.now() - queryStarted).toFixed(1).replace('.', ',');
      return t.query(term, rows.length, ms);
    });
  }
}

async function runExperimentOnce(report: Report): Promise<void> {
  const p = new Progress(report);
  // A separate database file per run; ':memory:' connections may share one native database.
  const name = `kokeilu-fts-${Date.now()}.db`;
  let db: SQLiteDatabase | null = null;
  const opened = await p.step('openDatabaseAsync', async () => {
    db = await openDatabaseAsync(name);
  });
  if (!opened || db === null) return;
  const database: SQLiteDatabase = db;
  try {
    await runChecks(database, p);
  } catch (error) {
    p.push(`✗ ${message(error)}`);
  }
  // Closing failed on the phone ("unfinalized statements", docs/adr/0003). Deleting an open
  // database file crashed Expo Go, so the file is deleted only after a successful close.
  const closed = await p.step('closeAsync', () => database.closeAsync());
  if (closed) await p.step('deleteDatabaseAsync', () => deleteDatabaseAsync(name));
  p.push(t.done);
}

// Runs are serialized: React runs effects twice in development.
let queue: Promise<void> = Promise.resolve();
function runExperiment(report: Report): Promise<void> {
  const run = queue.then(() => runExperimentOnce(report));
  queue = run.catch(() => {});
  return run;
}

export default function FtsExperimentScreen() {
  const { colors } = useTheme();
  const [lines, setLines] = useState<string[]>([t.running]);

  useEffect(() => {
    let active = true;
    void runExperiment((next) => {
      if (active) setLines(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: t.title }} />
      {lines.map((line, i) => (
        <Text key={i} style={[styles.body, { color: colors.text }]}>
          {line}
        </Text>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.rerun}
        onPress={() => {
          setLines([t.running]);
          void runExperiment(setLines);
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={styles.buttonText}>{t.rerun}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  body: { fontSize: 16 },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
