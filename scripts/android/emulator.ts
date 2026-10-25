// Starts an Android emulator in the background and waits until it has booted (docs/adr/0007).
//
// Usage (repo root): npm run emulator [-- <avd name>]
// Without a name, KEVYT_AVD or the first AVD from `emulator -list-avds` is used.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { adb, emulatorPath, run, toolEnv } from './tools.ts';

function bootedDevice(): string | undefined {
  const lines = adb('devices').split('\n').slice(1);
  return lines
    .map((l) => l.trim().split(/\s+/))
    .find(([id, state]) => id?.startsWith('emulator-') && state === 'device')?.[0];
}

if (bootedDevice()) {
  console.log(`Emulator already running: ${bootedDevice()}`);
  process.exit(0);
}

const avds = run(emulatorPath(), ['-list-avds'])
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('INFO'));
const avd = process.argv[2] ?? process.env.KEVYT_AVD ?? avds[0];
if (!avd) {
  throw new Error('No AVD found. Create a virtual device in Android Studio (Device Manager).');
}

console.log(`Starting emulator ${avd}…`);
spawn(emulatorPath(), ['-avd', avd, '-no-snapshot-save', '-no-boot-anim'], {
  detached: true,
  stdio: 'ignore',
  env: toolEnv(),
}).unref();

const started = Date.now();
while (Date.now() - started < 300_000) {
  await sleep(3000);
  try {
    if (bootedDevice() && adb('shell', 'getprop', 'sys.boot_completed') === '1') {
      console.log(`Booted in ${Math.round((Date.now() - started) / 1000)} s.`);
      process.exit(0);
    }
  } catch {
    // adb reports the device as offline while it boots.
  }
}
throw new Error('Emulator did not boot within 5 minutes.');
