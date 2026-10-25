// Device controls for manual and Claude-driven checks on the emulator (docs/adr/0007).
//
// Usage (repo root): npm run device -- <command>
//   screenshot [name]   save a screenshot to app/e2e/output/<name>.png
//   font <scale>        set the system font scale, e.g. 1.3 or 2.0 (LAA-06), and reopen the app;
//                       "reset" = 1.0. Wait for the app to load before taking a screenshot.
//   offline | online    turn airplane mode on or off (LAA-04, LAA-05)
//   open                open the app in Expo Go (Metro must be running)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { adb, adbPath, toolEnv } from './tools.ts';

const EXPO_GO = 'host.exp.exponent';

// 10.0.2.2 is the emulator's alias for the host, so no adb reverse is needed.
function openApp(): void {
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'exp://10.0.2.2:8081');
}

const [command, arg] = process.argv.slice(2);

switch (command) {
  case 'screenshot': {
    const dir = resolve('app/e2e/output');
    mkdirSync(dir, { recursive: true });
    const file = resolve(dir, `${arg ?? new Date().toISOString().replace(/[:.]/g, '-')}.png`);
    const result = spawnSync(adbPath(), ['exec-out', 'screencap', '-p'], {
      env: toolEnv(),
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(String(result.stderr));
    writeFileSync(file, result.stdout);
    console.log(file);
    break;
  }
  case 'font': {
    const scale = arg === 'reset' || arg === undefined ? '1.0' : arg.replace(',', '.');
    adb('shell', 'settings', 'put', 'system', 'font_scale', scale);
    // The running app keeps the old scale; restart Expo Go so the screenshot shows the new one.
    adb('shell', 'am', 'force-stop', EXPO_GO);
    openApp();
    console.log(`font_scale = ${scale}, app reopened`);
    break;
  }
  case 'offline':
  case 'online':
    adb(
      'shell',
      'cmd',
      'connectivity',
      'airplane-mode',
      command === 'offline' ? 'enable' : 'disable',
    );
    console.log(`airplane mode ${command === 'offline' ? 'on' : 'off'}`);
    break;
  case 'open':
    openApp();
    break;
  default:
    console.error('Commands: screenshot [name] | font <scale|reset> | offline | online | open');
    process.exit(1);
}
