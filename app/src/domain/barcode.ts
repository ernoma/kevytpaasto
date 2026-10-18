/** Barcode symbologies used on retail packages. */
export type RetailBarcodeType = 'ean13' | 'ean8' | 'upc_a' | 'upc_e';

export type BarcodeResult =
  | { ok: true; code: string }
  | { ok: false; reason: 'empty' | 'not_digits' | 'bad_length' | 'bad_check_digit' };

/** GS1 check digit for the given digits (without the check digit). */
export function gtinCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    // Weights alternate 3, 1, 3, … starting from the rightmost digit.
    const weight = (digits.length - i) % 2 === 1 ? 3 : 1;
    sum += Number(digits[i]) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

function hasValidCheckDigit(code: string): boolean {
  return gtinCheckDigit(code.slice(0, -1)) === Number(code[code.length - 1]);
}

/** Expands an 8-digit UPC-E code to 12-digit UPC-A. Returns null if it is not UPC-E. */
export function expandUpcE(upcE: string): string | null {
  if (!/^[01]\d{7}$/.test(upcE)) {
    return null;
  }
  const ns = upcE[0];
  const d = upcE.slice(1, 7);
  const check = upcE[7];
  const last = Number(d[5]);
  let body: string;
  if (last <= 2) {
    body = `${d.slice(0, 2)}${last}0000${d.slice(2, 5)}`;
  } else if (last === 3) {
    body = `${d.slice(0, 3)}00000${d.slice(3, 5)}`;
  } else if (last === 4) {
    body = `${d.slice(0, 4)}00000${d[4]}`;
  } else {
    body = `${d.slice(0, 5)}0000${last}`;
  }
  return `${ns}${body}${check}`;
}

/**
 * Normalizes a scanned or typed retail barcode so that the same product always gets the same
 * identifier (HAK-07): UPC-A and UPC-E are converted to EAN-13, EAN-8 is kept as is.
 * Typed input may contain spaces or dashes (HAK-05).
 */
export function normalizeBarcode(raw: string, type?: RetailBarcodeType): BarcodeResult {
  const trimmed = raw.replace(/[\s-]/g, '');
  if (trimmed === '') {
    return { ok: false, reason: 'empty' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: 'not_digits' };
  }

  let code = trimmed;
  if (type === 'upc_e' && code.length === 8) {
    const expanded = expandUpcE(code);
    if (expanded === null) {
      return { ok: false, reason: 'bad_length' };
    }
    code = expanded;
  }
  if (code.length === 12) {
    code = `0${code}`;
  }
  if (code.length !== 8 && code.length !== 13) {
    return { ok: false, reason: 'bad_length' };
  }
  if (!hasValidCheckDigit(code)) {
    return { ok: false, reason: 'bad_check_digit' };
  }
  return { ok: true, code };
}
