import {
  defaultDatabaseDirectory,
  importDatabaseFromAssetAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';

import { FINELI_SCHEMA } from '@/services/fineli';

import fineliInfo from '../../assets/fineli/fineli.json';

const FILE_NAME = 'fineli.db';
// Bundled read-only Fineli data built by scripts/fineli (plan section 3.2, docs/adr/0003).
const FINELI_ASSET = require('../../assets/fineli/fineli.db') as number;

/** The bundled release, shown in the data sources view (TIE-03). */
export const fineliRelease = fineliInfo;

function isAttached(sqlite: SQLiteDatabase): boolean {
  return (
    sqlite.getFirstSync('SELECT name FROM pragma_database_list WHERE name = ?', FINELI_SCHEMA) !==
    null
  );
}

function attach(sqlite: SQLiteDatabase, path: string): void {
  sqlite.runSync(`ATTACH DATABASE ? AS ${FINELI_SCHEMA}`, path);
}

function attachedVersion(sqlite: SQLiteDatabase): string | null {
  const row = sqlite.getFirstSync<{ value: string }>(
    `SELECT value FROM ${FINELI_SCHEMA}.meta WHERE key = 'converted_at'`,
  );
  return row?.value ?? null;
}

/**
 * Copies the bundled fineli.db next to the app database and attaches it to the connection.
 * A copy from an earlier app version is replaced. The connection stays open for the app's
 * lifetime, so the file is never closed or replaced while in use (docs/adr/0003).
 */
export async function attachFineli(sqlite: SQLiteDatabase): Promise<void> {
  if (isAttached(sqlite)) {
    return;
  }
  const path = `${String(defaultDatabaseDirectory)
    .replace(/^file:\/\//, '')
    .replace(/\/+$/, '')}/${FILE_NAME}`;
  // Copies only when the file does not exist yet.
  await importDatabaseFromAssetAsync(FILE_NAME, { assetId: FINELI_ASSET });
  attach(sqlite, path);
  if (attachedVersion(sqlite) === fineliInfo.convertedAt) {
    return;
  }
  sqlite.execSync(`DETACH DATABASE ${FINELI_SCHEMA}`);
  await importDatabaseFromAssetAsync(FILE_NAME, { assetId: FINELI_ASSET, forceOverwrite: true });
  attach(sqlite, path);
}
