// Runs the Maestro flows in app/e2e against the running emulator (docs/adr/0007).
// Metro must be running (`npx expo start` in app/) and the emulator booted (`npm run emulator`).
//
// Usage (repo root): npm run e2e [-- <flow file or directory>]
import { resolve } from 'node:path';

import { maestroPath, run } from './tools.ts';

// The flows open the app at exp://10.0.2.2:8081, the emulator's alias for the host's Metro.
const target = resolve(process.argv[2] ?? 'app/e2e');
run(maestroPath(), ['test', target], { stdio: 'inherit', cwd: resolve('app') });
