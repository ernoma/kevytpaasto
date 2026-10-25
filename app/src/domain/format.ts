// Finnish digit grouping uses a no-break space.
const THOUSANDS_SEPARATOR = ' ';
const MINUS_SIGN = '−';

/** Rounds energy for display only (LAS-03). Stored and summed values stay unrounded. */
export function roundKcal(value: number): number {
  const rounded = Math.round(value);
  // Avoid "-0".
  return rounded === 0 ? 0 : rounded;
}

/** Formats energy as whole kcal with Finnish digit grouping, e.g. 1234.4 → "1 234". */
export function formatKcal(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Energy must be finite, got ${value}`);
  }
  const rounded = roundKcal(value);
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  return rounded < 0 ? MINUS_SIGN + digits : digits;
}
