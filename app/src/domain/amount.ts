export type AmountError = 'empty' | 'invalid' | 'negative';

export type AmountResult = { ok: true; value: number } | { ok: false; error: AmountError };

// Digits with at most one decimal separator, comma or point (LAS-05). No exponents or grouping.
const AMOUNT_PATTERN = /^-?(\d+([.,]\d*)?|[.,]\d+)$/;

/**
 * Parses a user-typed amount. Accepts a decimal comma or point and surrounding whitespace.
 * Empty, malformed and negative values are rejected (LAS-04, LAS-05). Zero is accepted because
 * zero energy may be recorded intentionally (LAS-04).
 */
export function parseAmount(text: string): AmountResult {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, error: 'empty' };
  }
  if (!AMOUNT_PATTERN.test(trimmed)) {
    return { ok: false, error: 'invalid' };
  }
  const value = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'invalid' };
  }
  if (value < 0) {
    return { ok: false, error: 'negative' };
  }
  // Normalise -0 to 0.
  return { ok: true, value: value === 0 ? 0 : value };
}

/** True for a finite, non-negative energy or amount (LAS-04). */
export function isNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
