const { createHash } = require('node:crypto');
const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are imported as .sql files (see babel.config.js).
config.resolver.sourceExts.push('sql');
// The bundled read-only Fineli database (src/db/fineli.ts).
config.resolver.assetExts.push('db');

// Maestro writes logs and screenshots under e2e/output on every run; Metro need not watch them.
config.resolver.blockList = [/[\\/]e2e[\\/]output[\\/].*/];

// inline-import copies each .sql file into migrations.js, but Metro caches migrations.js by its
// own content, so an edited migration would be served stale (seen with 0001 in phase 2b). Tie
// the transform cache to the SQL files; restart Metro after changing a migration.
const migrationsDir = path.join(__dirname, 'src/db/migrations');
const sqlHash = createHash('sha256');
for (const file of readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()) {
  sqlHash.update(file).update(readFileSync(path.join(migrationsDir, file)));
}
config.cacheVersion = sqlHash.digest('hex');

module.exports = config;
