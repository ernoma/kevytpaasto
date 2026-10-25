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

/**
 * Formats an amount or energy density for display with at most one decimal and a decimal
 * comma (LAS-03, LAS-05): 12.5 → "12,5", 0.25 → "0,3", 1234 → "1 234".
 */
export function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Value must be finite, got ${value}`);
  }
  const tenths = Math.round(Math.abs(value) * 10);
  const whole = Math.floor(tenths / 10)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const decimal = tenths % 10;
  const text = decimal === 0 ? whole : `${whole},${decimal}`;
  return value < 0 && tenths !== 0 ? MINUS_SIGN + text : text;
}

/** Formats a stored number for an editable field with a decimal comma (LAS-05): 12.5 → "12,5". */
export function formatAmountInput(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Amount must be finite, got ${value}`);
  }
  return String(value).replace('.', ',');
}
