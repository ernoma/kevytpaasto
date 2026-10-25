import { parseAmount, type AmountError } from './amount';

export type LimitError = AmountError | 'zero';

export type LimitResult = { ok: true; value: number } | { ok: false; error: LimitError };

/** True for a usable calorie limit: finite and greater than zero (KAY-01). */
export function isValidLimit(kcal: number): boolean {
  return Number.isFinite(kcal) && kcal > 0;
}

/** Parses a user-typed calorie limit (KAY-01, LAS-05). The limit must be greater than zero. */
export function parseLimit(text: string): LimitResult {
  const result = parseAmount(text);
  if (!result.ok) {
    return result;
  }
  if (!isValidLimit(result.value)) {
    return { ok: false, error: 'zero' };
  }
  return result;
}
