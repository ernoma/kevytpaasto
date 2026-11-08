// Scans the Git history for secrets with gitleaks (AVO-03, docs/adr/0014).
//
//   npm run secrets      the whole history of the repository
//   .githooks/pre-push   the commits being pushed (enable once: git config core.hooksPath .githooks)
//
// GITLEAKS_BIN overrides the gitleaks location; it can also be set in the git-ignored .env file in
// the repo root (see .env.example). If gitleaks cannot be run, the scan fails, so a push is never
// let through unchecked.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { pushRanges } from './pushRanges.ts';

// npm scripts and Git hooks run from the repo root. Variables already set in the shell win.
const envFile = resolve('.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

function gitleaksPath(): string {
  if (process.env.GITLEAKS_BIN) return process.env.GITLEAKS_BIN;
  if (process.platform === 'win32') {
    // winget puts its package directory on PATH only for shells started after the install.
    const packages = join(process.env.LOCALAPPDATA ?? homedir(), 'Microsoft', 'WinGet', 'Packages');
    const dir = existsSync(packages)
      ? readdirSync(packages).find((name) => name.startsWith('Gitleaks.Gitleaks_'))
      : undefined;
    const exe = dir === undefined ? undefined : join(packages, dir, 'gitleaks.exe');
    if (exe !== undefined && existsSync(exe)) return exe;
  }
  return 'gitleaks';
}

/** Runs gitleaks on the given git log options, or on the whole history, and returns its status. */
function scan(logOpts?: string): number {
  const args = ['git', '--redact', '--no-banner', '--verbose'];
  if (logOpts !== undefined) args.push(`--log-opts=${logOpts}`);
  args.push('.');
  const result = spawnSync(gitleaksPath(), args, { stdio: 'inherit' });
  if (result.error) {
    console.error(
      `Could not run gitleaks: ${result.error.message}\n` +
        'Install it (Windows: winget install --id Gitleaks.Gitleaks -e) or set GITLEAKS_BIN.',
    );
    return 1;
  }
  return result.status ?? 1;
}

const mode = process.argv[2];
if (mode === undefined) {
  process.exit(scan());
} else if (mode === 'pre-push') {
  // Git passes the pushed refs on stdin.
  let status = 0;
  for (const range of pushRanges(readFileSync(0, 'utf8'))) status = Math.max(status, scan(range));
  if (status !== 0) console.error('Push stopped: gitleaks reported possible secrets or failed.');
  process.exit(status);
} else {
  console.error(`Unknown mode "${mode}". Run without arguments or with "pre-push".`);
  process.exit(2);
}
