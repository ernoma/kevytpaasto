// Locates the Android SDK tools and Maestro for the emulator scripts (docs/adr/0007).
//
// ANDROID_HOME (or ANDROID_SDK_ROOT) overrides the SDK location, MAESTRO_BIN the Maestro launcher.
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const isWindows = process.platform === 'win32';

function defaultSdkDir(): string {
  if (isWindows) return join(process.env.LOCALAPPDATA ?? homedir(), 'Android', 'Sdk');
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Android', 'sdk');
  return join(homedir(), 'Android', 'Sdk');
}

export function sdkDir(): string {
  const dir = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? defaultSdkDir();
  if (!existsSync(dir)) {
    throw new Error(`Android SDK not found at ${dir}. Set ANDROID_HOME to the SDK directory.`);
  }
  return dir;
}

export function adbPath(): string {
  return join(sdkDir(), 'platform-tools', isWindows ? 'adb.exe' : 'adb');
}

export function emulatorPath(): string {
  return join(sdkDir(), 'emulator', isWindows ? 'emulator.exe' : 'emulator');
}

export function maestroPath(): string {
  if (process.env.MAESTRO_BIN) return process.env.MAESTRO_BIN;
  const local = isWindows
    ? join(process.env.LOCALAPPDATA ?? homedir(), 'maestro', 'bin', 'maestro.bat')
    : join(homedir(), '.maestro', 'bin', 'maestro');
  return existsSync(local) ? local : 'maestro';
}

// Environment for child processes: SDK location and Maestro without telemetry (AVO-02 spirit).
export function toolEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ANDROID_HOME: sdkDir(),
    MAESTRO_CLI_NO_ANALYTICS: '1',
    MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
    EXPO_NO_TELEMETRY: '1',
  };
}

export function run(command: string, args: string[], options: SpawnSyncOptions = {}): string {
  // .bat launchers need a shell on Windows; the shell does not quote paths with spaces itself.
  const shell = isWindows && command.endsWith('.bat');
  const quote = (s: string) => (shell && /\s/.test(s) ? `"${s}"` : s);
  const result = spawnSync(quote(command), args.map(quote), {
    encoding: 'utf8',
    env: toolEnv(),
    shell,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && options.stdio !== 'inherit') {
    throw new Error(`${command} ${args.join(' ')} failed:\n${String(result.stderr)}`);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
  return String(result.stdout ?? '');
}

export function adb(...args: string[]): string {
  return run(adbPath(), args).trim();
}
