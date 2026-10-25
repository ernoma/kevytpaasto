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

const WEEKDAYS_FI = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'] as const;

/**
 * Formats a local date for display, e.g. "2026-10-25" → "su 25.10.2026" (PAI-02).
 * Does not use Intl, which is incomplete in Hermes.
 */
export function formatDateFi(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new RangeError(`Expected a YYYY-MM-DD date, got ${date}`);
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const weekday = WEEKDAYS_FI[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]!;
  return `${weekday} ${day}.${month}.${year}`;
}

/** Formats a stored number for an editable field with a decimal comma (LAS-05): 12.5 → "12,5". */
export function formatAmountInput(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Amount must be finite, got ${value}`);
  }
  return String(value).replace('.', ',');
}
