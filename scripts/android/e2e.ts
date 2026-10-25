// Runs the Maestro flows in app/e2e against the running emulator (docs/adr/0007).
// Metro must be running (`npx expo start` in app/) and the emulator booted (`npm run emulator`).
//
// Usage (repo root): npm run e2e [-- <flow file or directory>]
//
// Maestro writes takeScreenshot images to <output>/<flow>/takeScreenshot/. The run's logs stay
// in app/e2e/output/last-run/ and the screenshots are copied to app/e2e/output/<name>.png.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { maestroPath, runInherited } from './tools.ts';

// The flows open the app at exp://10.0.2.2:8081, the emulator's alias for the host's Metro.
const target = resolve(process.argv[2] ?? 'app/e2e');
const outputDir = resolve('app/e2e/output');
const runDir = join(outputDir, 'last-run');
rmSync(runDir, { recursive: true, force: true });
mkdirSync(runDir, { recursive: true });

const status = runInherited(
  maestroPath(),
  [
    'test',
    `--test-output-dir=${runDir}`,
    `--debug-output=${runDir}`,
    '--flatten-debug-output',
    target,
  ],
  { cwd: resolve('app') },
);

// Copy screenshots even from a failed run: they show where it stopped.
for (const flow of readdirSync(runDir, { withFileTypes: true })) {
  const shots = join(runDir, flow.name, 'takeScreenshot');
  if (!flow.isDirectory() || !existsSync(shots)) continue;
  for (const file of readdirSync(shots)) {
    copyFileSync(join(shots, file), join(outputDir, file));
    console.log(`Screenshot: ${join(outputDir, file)}`);
  }
}
process.exit(status);
