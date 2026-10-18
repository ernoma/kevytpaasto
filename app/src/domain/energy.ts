/** 1 kcal = 4.184 kJ (LAS-01). */
export const KJ_PER_KCAL = 4.184;

/**
 * Converts kilojoules to kilocalories without rounding (LAS-01, LAS-03).
 * Negative or non-finite energy is rejected (LAS-04).
 */
export function kjToKcal(kj: number): number {
  if (!Number.isFinite(kj) || kj < 0) {
    throw new RangeError(`Energy must be a finite non-negative number, got ${kj}`);
  }
  return kj / KJ_PER_KCAL;
}
