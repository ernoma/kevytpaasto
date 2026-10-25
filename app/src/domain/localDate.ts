/** A local calendar date as YYYY-MM-DD (PAI-05). Never a timestamp. */
export type LocalDate = string & { readonly __brand: 'LocalDate' };

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, length: number): string {
  return value.toString().padStart(length, '0');
}

function fromParts(year: number, month: number, day: number): LocalDate {
  return [pad(year, 4), pad(month, 2), pad(day, 2)].join('-') as LocalDate;
}

/** The calendar date of an instant in the device's local time zone (PAI-05). */
export function toLocalDate(instant: Date): LocalDate {
  return fromParts(instant.getFullYear(), instant.getMonth() + 1, instant.getDate());
}

/** True if the value is YYYY-MM-DD and an existing calendar date. */
export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
}

/** Validates a date string; throws on anything other than a real YYYY-MM-DD date. */
export function parseLocalDate(value: string): LocalDate {
  if (!isLocalDate(value)) {
    throw new RangeError(`Expected a YYYY-MM-DD date, got ${value}`);
  }
  return value;
}

/** Adds calendar days. Works on calendar components, so DST changes have no effect. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return fromParts(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Negative if a is earlier than b, positive if later, zero if equal. */
export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
