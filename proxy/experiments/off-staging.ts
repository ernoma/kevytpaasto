// Phase 0 experiment: writing to the Open Food Facts STAGING environment (docs/adr/0004).
//
// Usage (repo root): npm run off:staging -w proxy
//
// Reads credentials from proxy/.dev.vars (gitignored):
//   OFF_STAGING_USER_ID=<staging username, not e-mail>
//   OFF_STAGING_PASSWORD=<staging password>
//   OFF_CONTACT=<contact for the User-Agent header, e.g. an e-mail address>
//
// Writes a log without credentials to proxy/.experiments/. Never targets production.
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const STAGING = 'https://world.openfoodfacts.net';
const APP_NAME = 'Kevytpaasto';
const APP_VERSION = '0.1.0';

const proxyDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDevVars(): Record<string, string> {
  const path = join(proxyDir, '.dev.vars');
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. See the usage comment at the top of this file.`);
  }
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) vars[match[1]!] = match[2]!.replace(/^["']|["']$/g, '');
  }
  for (const key of ['OFF_STAGING_USER_ID', 'OFF_STAGING_PASSWORD', 'OFF_CONTACT']) {
    if (!vars[key]) throw new Error(`${key} is missing from proxy/.dev.vars`);
  }
  return vars;
}

const vars = loadDevVars();
const userId = vars.OFF_STAGING_USER_ID!;
const password = vars.OFF_STAGING_PASSWORD!;
const userAgent = `${APP_NAME}/${APP_VERSION} (${vars.OFF_CONTACT})`;
// Staging is protected by public HTTP basic auth (off/off) against search engine indexing.
const basicAuth = `Basic ${Buffer.from('off:off').toString('base64')}`;
const appUuid = randomUUID();

const log: unknown[] = [];

function redact(text: string): string {
  return text.split(password).join('***').split(encodeURIComponent(password)).join('***');
}

async function call(step: string, path: string, init: RequestInit = {}) {
  const url = `${STAGING}${path}`;
  if (!url.startsWith(STAGING) || url.includes('openfoodfacts.org')) {
    throw new Error(`Refusing to call a non-staging URL: ${url}`);
  }
  const started = Date.now();
  const response = await fetch(url, {
    ...init,
    headers: { 'User-Agent': userAgent, Authorization: basicAuth, ...init.headers },
  });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Keep non-JSON bodies (HTML error pages) as text.
  }
  const entry = {
    step,
    method: init.method ?? 'GET',
    path,
    status: response.status,
    ms: Date.now() - started,
    body,
  };
  log.push(JSON.parse(redact(JSON.stringify(entry))));
  console.log(
    `\n== ${step}: ${init.method ?? 'GET'} ${path} -> ${response.status} (${entry.ms} ms)`,
  );
  console.log(
    redact(
      typeof body === 'string' ? body.slice(0, 600) : JSON.stringify(body, null, 2).slice(0, 1500),
    ),
  );
  return { status: response.status, body: body as Record<string, unknown> };
}

function ean13(prefix: string): string {
  let digits = prefix;
  while (digits.length < 12) digits += String(randomInt(10));
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  return digits + String((10 - (sum % 10)) % 10);
}

/** A simple 800x800 PNG test image (OFF rejects very small images). */
function testPng(): Buffer {
  const size = 800;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 3;
      const stripe = Math.floor(x / 50) % 2 === 0;
      raw[i] = stripe ? 230 : 40;
      raw[i + 1] = Math.floor((y / size) * 255);
      raw[i + 2] = 120;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function form(fields: Record<string, string>): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  };
}

const PRODUCT_FIELDS =
  'code,product_name,product_name_fi,brands,nutriments,nutrition_data_per,lang,images,last_editor,creator';

async function main() {
  console.log(`User-Agent: ${userAgent}\napp_uuid: ${appUuid}`);

  // 1. Find an unused barcode (OFF-01).
  let code = '';
  for (let attempt = 0; attempt < 5 && code === ''; attempt++) {
    const candidate = ean13('200');
    const { status } = await call(
      '1. lookup unused barcode',
      `/api/v3/product/${candidate}?fields=code`,
    );
    if (status === 404) code = candidate;
  }
  if (code === '') throw new Error('Could not find an unused barcode');

  const common = {
    code,
    user_id: userId,
    password,
    cc: 'fi',
    lc: 'fi',
    app_name: APP_NAME,
    app_version: APP_VERSION,
    app_uuid: appUuid,
    comment: `${APP_NAME} ${APP_VERSION} kokeilu (vaihe 0)`,
  };

  // 2. Create the product with the classic write endpoint.
  await call(
    '2. create product (product_jqm2.pl)',
    '/cgi/product_jqm2.pl',
    form({
      ...common,
      product_name: 'Kevytpaasto testituote',
      add_brands: 'Kevytpaasto-testi',
      nutrition_data_per: '100g',
      'nutriment_energy-kcal': '80',
      'nutriment_energy-kcal_unit': 'kcal',
    }),
  );

  // 3. Read it back.
  await call('3. read back', `/api/v3/product/${code}?fields=${PRODUCT_FIELDS}`);

  // 4. Send the identical request again: must not create duplicates or change data (OFF-08).
  await call(
    '4. resend identical request',
    '/cgi/product_jqm2.pl',
    form({
      ...common,
      product_name: 'Kevytpaasto testituote',
      add_brands: 'Kevytpaasto-testi',
      nutrition_data_per: '100g',
      'nutriment_energy-kcal': '80',
      'nutriment_energy-kcal_unit': 'kcal',
    }),
  );

  // 5. Upload a front image with the v3 images endpoint and select it as front_fi.
  const image = testPng().toString('base64');
  await call('5. upload image (v3)', `/api/v3/product/${code}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lc: 'fi',
      cc: 'fi',
      user_id: userId,
      password,
      image_data_base64: image,
      selected: { front: { fi: {} } },
    }),
  });

  // 6. Same image again: how is a duplicate upload reported?
  await call('6. upload same image again (v3)', `/api/v3/product/${code}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lc: 'fi',
      cc: 'fi',
      user_id: userId,
      password,
      image_data_base64: image,
    }),
  });

  // 7. v3 PATCH as an alternative write path.
  await call('7. update with v3 PATCH', `/api/v3/product/${code}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lc: 'fi',
      cc: 'fi',
      user_id: userId,
      password,
      fields: PRODUCT_FIELDS,
      product: { product_name_fi: 'Kevytpaasto testituote (v3)', quantity: '200 g' },
    }),
  });

  // 8. Wrong password: what does the error look like?
  await call(
    '8. wrong password',
    '/cgi/product_jqm2.pl',
    form({ ...common, password: `${password}-wrong`, product_name: 'Ei pitäisi tallentua' }),
  );

  // 9. Missing barcode.
  await call('9. missing barcode', '/cgi/product_jqm2.pl', form({ ...common, code: '' }));

  // 10. Final state and edit history.
  await call(
    '10. final state',
    `/api/v3/product/${code}?fields=${PRODUCT_FIELDS},last_modified_by,editors_tags`,
  );

  const outDir = join(proxyDir, '.experiments');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(
    outDir,
    `off-staging-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  writeFileSync(outFile, redact(JSON.stringify({ code, appUuid, userAgent, log }, null, 2)));
  console.log(`\nTest product: ${STAGING}/product/${code}\nLog: ${outFile}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
