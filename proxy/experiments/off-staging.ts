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
// Credentials are sent only in write requests, never in GET requests (docs/adr/0013).
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const STAGING = 'https://world.openfoodfacts.net';
const APP_NAME = 'Kevytpaasto';
const APP_VERSION = '0.1.0';

// API v3 sub-versions (docs/toteutussuunnitelma.md, section 5.1, and docs/adr/0013). Reads compare
// the candidate pinned version with the latest one. Writes use the latest version: the v3 write API
// accepts energy only in the new nutrition input set structure, and image upload needs v3.3 or later.
const CANDIDATE_READ_VERSION = 'v3.4';
const LATEST_VERSION = 'v3.6';
const READ_VERSIONS = [CANDIDATE_READ_VERSION, LATEST_VERSION];
const WRITE_VERSION = LATEST_VERSION;

// v3.5 changed the nutrition structure, so both nutriments and nutrition are requested.
// data_sources_tags shows whether the app marking (app_name) was recorded.
const READ_FIELDS = [
  'code',
  'product_name',
  'product_name_fi',
  'brands',
  'brands_tags',
  'lang',
  'nutriments',
  'nutrition',
  'nutrition_data_per',
  'schema_version',
  'data_sources_tags',
  'images',
  'creator',
  'last_editor',
  'last_modified_by',
].join(',');

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
const comment = `${APP_NAME} ${APP_VERSION} kokeilu (vaihe 0)`;
// The v3 write API reads app_name, app_version and app_uuid as CGI parameters, not from the JSON
// body, so v3 requests send them in the query string (docs/adr/0004, supplement 8.11.2026).
const appQuery = new URLSearchParams({
  app_name: APP_NAME,
  app_version: APP_VERSION,
  app_uuid: appUuid,
}).toString();

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

/** A striped RGB PNG test image. OFF rejects images smaller than 640 x 160 px. */
function testPng(width: number, height: number): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      const stripe = Math.floor(x / 50) % 2 === 0;
      raw[i] = stripe ? 230 : 40;
      raw[i + 1] = Math.floor((y / height) * 255);
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
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
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

function json(method: 'PATCH' | 'POST', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/** Product data for the v3 write API. Energy uses the nutrition input set structure. */
function v3Product(kcal: string) {
  return {
    lang: 'fi',
    product_name_fi: 'Kevytpaasto testituote',
    brands_tags_add: ['Kevytpaasto-testi'],
    nutrition: {
      input_sets: [
        {
          source: 'packaging',
          preparation: 'as_sold',
          per: '100g',
          nutrients: { 'energy-kcal': { value_string: kcal, unit: 'kcal' } },
        },
      ],
    },
  };
}

/** A v3 PATCH request. Credentials and comment go in the JSON body, app_* in the query string. */
function v3Write(product: unknown, overrides: Record<string, string> = {}): RequestInit {
  return json('PATCH', {
    lc: 'fi',
    cc: 'fi',
    tags_lc: 'fi',
    user_id: userId,
    password,
    comment,
    fields: 'updated',
    product,
    ...overrides,
  });
}

async function readWithAllVersions(step: string, code: string) {
  for (const version of READ_VERSIONS) {
    await call(`${step} (${version})`, `/api/${version}/product/${code}?fields=${READ_FIELDS}`);
  }
}

async function main() {
  console.log(`User-Agent: ${userAgent}\napp_uuid: ${appUuid}`);

  // 1. Find an unused barcode (OFF-01). GET requests never carry credentials.
  let code = '';
  for (let attempt = 0; attempt < 5 && code === ''; attempt++) {
    const candidate = ean13('200');
    const { status } = await call(
      '1. lookup unused barcode',
      `/api/${CANDIDATE_READ_VERSION}/product/${candidate}?fields=code`,
    );
    if (status === 404) code = candidate;
  }
  if (code === '') throw new Error('Could not find an unused barcode');

  const writePath = `/api/${WRITE_VERSION}/product/${code}?${appQuery}`;
  const imagePath = `/api/${WRITE_VERSION}/product/${code}/images?${appQuery}`;

  // 2. Create the product with the v3 write API.
  await call('2. create product (v3 PATCH)', writePath, v3Write(v3Product('80')));

  // 3. Compare the sub-versions and check whether the app marking was recorded.
  await readWithAllVersions('3. read back', code);

  // 4. Upload a front image with the v3 images endpoint and select it as front / fi.
  const image = testPng(800, 800).toString('base64');
  const imageBody = { lc: 'fi', cc: 'fi', user_id: userId, password, image_data_base64: image };
  await call(
    '4. upload image (v3)',
    imagePath,
    json('POST', { ...imageBody, selected: { front: { fi: {} } } }),
  );

  // 5. Same image again: how is a duplicate upload reported?
  await call('5. upload same image again (v3)', imagePath, json('POST', imageBody));

  // 6. An image below the minimum size: what does the error look like?
  await call(
    '6. upload too small image (v3)',
    imagePath,
    json('POST', { ...imageBody, image_data_base64: testPng(320, 80).toString('base64') }),
  );

  // 7. Send the identical v3 write again: must not create duplicates or change data (OFF-08).
  await call('7. resend identical v3 write', writePath, v3Write(v3Product('80')));

  // 8. Legacy write endpoint for comparison: form fields, where app_* parameters are always read.
  await call(
    '8. write energy with product_jqm2.pl',
    '/cgi/product_jqm2.pl',
    form({
      code,
      user_id: userId,
      password,
      cc: 'fi',
      lc: 'fi',
      app_name: APP_NAME,
      app_version: APP_VERSION,
      app_uuid: appUuid,
      comment: `${comment}, product_jqm2.pl`,
      nutrition_data_per: '100g',
      'nutriment_energy-kcal': '81',
      'nutriment_energy-kcal_unit': 'kcal',
    }),
  );

  // 9. Wrong password: what does the error look like?
  await call(
    '9. wrong password (v3)',
    writePath,
    v3Write({ product_name_fi: 'Ei pitäisi tallentua' }, { password: `${password}-wrong` }),
  );

  // 10. Invalid barcode.
  await call(
    '10. invalid barcode (v3)',
    `/api/${WRITE_VERSION}/product/abc?${appQuery}`,
    v3Write({ product_name_fi: 'Ei pitäisi tallentua' }),
  );

  // 11. Final state with both sub-versions.
  await readWithAllVersions('11. final state', code);

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
