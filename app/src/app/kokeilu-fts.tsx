// Phase 0 experiment: is SQLite FTS5 available in expo-sqlite on the phone, and how fast is a
// prefix search over a Fineli-sized table (docs/adr/0003)? Remove when phase 3 adds Fineli search.
import { openDatabaseAsync } from 'expo-sqlite';
import { Stack, useTheme } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { strings } from '@/ui/strings.fi';

const t = strings.ftsExperiment;

const HEADS = [
  'Kaurapuuro',
  'Omena',
  'Banaani',
  'Maito',
  'Ruisleipä',
  'Kananmuna',
  'Peruna',
  'Riisi',
];
const PARTS = ['keitetty', 'kuorittu', 'paistettu', 'suolaa', 'suolaton', 'kotimainen', 'täysjyvä'];
const QUERIES = ['kaura', 'omena', 'ruisleipä', 'peruna keitetty', 'riisi', 'kananmuna'];
const ROWS = 4200;

function syntheticName(i: number): string {
  return `${HEADS[i % HEADS.length]}, ${PARTS[i % PARTS.length]}, ${PARTS[(i * 3) % PARTS.length]} ${i}`;
}

function toMatchQuery(term: string): string {
  return term
    .split(/\s+/)
    .map((w) => `"${w.replace(/"/g, '')}"*`)
    .join(' ');
}

async function runExperiment(): Promise<string[]> {
  const out: string[] = [];
  const db = await openDatabaseAsync(':memory:');
  try {
    const version = await db.getFirstAsync<{ v: string }>('SELECT sqlite_version() AS v');
    out.push(t.sqliteVersion(version?.v ?? '?'));
    // Same table definition as scripts/fineli/convert.ts.
    await db.execAsync(`
        CREATE TABLE fineli_food (id INTEGER PRIMARY KEY, name_fi TEXT NOT NULL);
        CREATE VIRTUAL TABLE fineli_food_fts USING fts5(
          name_fi, content='fineli_food', content_rowid='id',
          tokenize="unicode61 remove_diacritics 0", prefix='2 3'
        );
      `);
    const started = Date.now();
    await db.withTransactionAsync(async () => {
      const insert = await db.prepareAsync('INSERT INTO fineli_food (id, name_fi) VALUES (?, ?)');
      try {
        for (let i = 1; i <= ROWS; i++) await insert.executeAsync([i, syntheticName(i)]);
      } finally {
        await insert.finalizeAsync();
      }
    });
    await db.execAsync("INSERT INTO fineli_food_fts(fineli_food_fts) VALUES ('rebuild');");
    out.push(t.ftsOk(ROWS, Date.now() - started));

    for (const term of QUERIES) {
      const queryStarted = performance.now();
      const rows = await db.getAllAsync(
        `SELECT f.id, f.name_fi FROM fineli_food_fts s JOIN fineli_food f ON f.id = s.rowid
           WHERE fineli_food_fts MATCH ? ORDER BY rank LIMIT 20`,
        [toMatchQuery(term)],
      );
      const ms = (performance.now() - queryStarted).toFixed(1).replace('.', ',');
      out.push(t.query(term, rows.length, ms));
    }
  } catch (error) {
    out.push(`${t.ftsFailed} ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.closeAsync();
  }
  return out;
}

export default function FtsExperimentScreen() {
  const { colors } = useTheme();
  const [lines, setLines] = useState<string[]>([t.running]);

  useEffect(() => {
    let active = true;
    void runExperiment().then((out) => {
      if (active) setLines(out);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: t.title }} />
      {lines.map((line, i) => (
        <Text
          key={i}
          accessibilityLiveRegion="polite"
          style={[styles.body, { color: colors.text }]}
        >
          {line}
        </Text>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.rerun}
        onPress={() => {
          setLines([t.running]);
          void runExperiment().then(setLines);
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
