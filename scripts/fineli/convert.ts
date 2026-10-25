// Converts the Fineli open data package (zip or extracted folder) into the app's fineli.db
// (docs/adr/0003).
//
// Usage (repo root):
//   npm run fineli:convert -w scripts -- <package.zip | folder> --year 2019 [--release 20.0] [--out dir]
//
// The package must be downloaded manually from https://fineli.fi/fineli/fi/avoin-data because
// fineli.fi blocks automated downloads. Licence: CC BY 4.0, source THL / Fineli. The output
// (default app/assets/fineli/) is committed; the app copies it on start when convertedAt changes.
import { writeFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { buildFineliDb, readPackage, releaseFromDescription } from './build.ts';

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function main() {
  // npm runs workspace scripts in scripts/, so paths are resolved against the caller's directory.
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const args = process.argv.slice(2);
  const input = args.find((arg, i) => !arg.startsWith('--') && !args[i - 1]?.startsWith('--'));
  const year = option(args, '--year');
  if (input === undefined || year === undefined) {
    console.error(
      'Usage: convert.ts <package.zip | folder> --year 2019 [--release 20.0] [--out dir]',
    );
    process.exit(1);
  }
  const outDir = resolve(cwd, option(args, '--out') ?? 'app/assets/fineli');
  const files = readPackage(resolve(cwd, input));
  const release = option(args, '--release') ?? releaseFromDescription(files);
  if (!release) {
    console.error('Release number not found in descript.txt; give it with --release');
    process.exit(1);
  }
  const info = {
    release,
    year,
    packageName: basename(resolve(cwd, input)),
    convertedAt: new Date().toISOString(),
  };

  const output = join(outDir, 'fineli.db');
  const result = buildFineliDb(files, output, info);
  // Read by the app to show the release and to replace an outdated copy on the device.
  writeFileSync(
    join(outDir, 'fineli.json'),
    `${JSON.stringify({ ...info, foodCount: result.foods }, null, 2)}\n`,
  );

  console.log(`Release ${release} (${year}), ENERC unit ${result.energyUnit ?? '(not found)'}`);
  console.log(
    `Foods: ${result.foods}, missing energy: ${result.missingEnergy}, serving units: ${result.units}`,
  );
  console.log(`Wrote ${output} (${(statSync(output).size / 1024 / 1024).toFixed(2)} MB)`);
}

main();
