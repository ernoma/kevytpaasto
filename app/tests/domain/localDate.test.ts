import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  addDays,
  compareLocalDates,
  isLocalDate,
  parseLocalDate,
  toLocalDate,
} from '@/domain/localDate';

describe('local dates (PAI-05)', () => {
  let originalTz: string | undefined;

  beforeEach(() => {
    originalTz = process.env.TZ;
  });

  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it('PAI-05: uses the local calendar day, not the UTC day', () => {
    // 22:30 UTC on 25 October 2026 is already 00:30 on 26 October in Helsinki (EET, UTC+2).
    const instant = new Date('2026-10-25T22:30:00Z');
    process.env.TZ = 'Europe/Helsinki';
    expect(toLocalDate(instant)).toBe('2026-10-26');
    process.env.TZ = 'America/New_York';
    expect(toLocalDate(instant)).toBe('2026-10-25');
    process.env.TZ = 'UTC';
    expect(toLocalDate(instant)).toBe('2026-10-25');
  });

  it('PAI-05: pads months and days', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('PAI-05: validates real calendar dates only', () => {
    expect(isLocalDate('2026-10-25')).toBe(true);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('2026-10-25T00:00:00Z')).toBe(false);
    expect(isLocalDate('25.10.2026')).toBe(false);
    expect(isLocalDate('2026-1-5')).toBe(false);
    expect(() => parseLocalDate('2026-04-31')).toThrow(RangeError);
    expect(parseLocalDate('2026-04-30')).toBe('2026-04-30');
  });

  it('PAI-05: adds calendar days across months, years and DST changes', () => {
    process.env.TZ = 'Europe/Helsinki';
    expect(addDays(parseLocalDate('2026-10-24'), 1)).toBe('2026-10-25');
    expect(addDays(parseLocalDate('2026-10-25'), 1)).toBe('2026-10-26');
    expect(addDays(parseLocalDate('2026-03-28'), 2)).toBe('2026-03-30');
    expect(addDays(parseLocalDate('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(parseLocalDate('2026-03-01'), -1)).toBe('2026-02-28');
  });

  it('compares dates chronologically', () => {
    const a = parseLocalDate('2026-09-30');
    const b = parseLocalDate('2026-10-01');
    expect(compareLocalDates(a, b)).toBeLessThan(0);
    expect(compareLocalDates(b, a)).toBeGreaterThan(0);
    expect(compareLocalDates(a, a)).toBe(0);
  });
});
