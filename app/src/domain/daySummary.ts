import { roundKcal } from './format';

export type DayStatus = 'remaining' | 'over';

export interface DaySummary {
  /** Sum of unrounded entry energies (LAS-03). */
  consumedKcal: number;
  limitKcal: number;
  /** consumedKcal − limitKcal, unrounded. */
  differenceKcal: number;
  status: DayStatus;
  /** Unrounded kcal left; zero when over the limit. */
  remainingKcal: number;
  /** Unrounded kcal over the limit; zero when within it. */
  overKcal: number;
}

/**
 * Summarises a fast day (PAI-02, PAI-03). The sum is computed from unrounded entries (LAS-03).
 * The status follows the difference as it is displayed, so a fraction of a kcal over the limit
 * is never shown as "over by 0 kcal". Exceeding the limit is not an error (PAI-03).
 */
export function daySummary(entries: readonly { kcal: number }[], limitKcal: number): DaySummary {
  if (!Number.isFinite(limitKcal) || limitKcal < 0) {
    throw new RangeError(`Limit must be a finite non-negative number, got ${limitKcal}`);
  }
  const consumedKcal = entries.reduce((sum, entry) => sum + entry.kcal, 0);
  const differenceKcal = consumedKcal - limitKcal;
  const status: DayStatus = roundKcal(differenceKcal) > 0 ? 'over' : 'remaining';
  return {
    consumedKcal,
    limitKcal,
    differenceKcal,
    status,
    remainingKcal: status === 'remaining' ? Math.max(0, -differenceKcal) : 0,
    overKcal: status === 'over' ? differenceKcal : 0,
  };
}
