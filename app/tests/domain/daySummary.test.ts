import { describe, expect, it } from 'vitest';

import { daySummary } from '@/domain/daySummary';
import { formatKcal, roundKcal } from '@/domain/format';

describe('daySummary (PAI-02, PAI-03, LAS-03)', () => {
  it('PAI-02: an empty day has the whole limit remaining', () => {
    expect(daySummary([], 600)).toEqual({
      consumedKcal: 0,
      limitKcal: 600,
      differenceKcal: -600,
      status: 'remaining',
      remainingKcal: 600,
      overKcal: 0,
    });
  });

  it('PAI-02: subtracts consumed energy from the limit', () => {
    const summary = daySummary([{ kcal: 120 }, { kcal: 80 }], 600);
    expect(summary.consumedKcal).toBe(200);
    expect(summary.status).toBe('remaining');
    expect(summary.remainingKcal).toBe(400);
    expect(summary.overKcal).toBe(0);
  });

  it('LAS-03: sums unrounded values', () => {
    // Each row displays as 100 kcal, but the sum is 301.5 → 302, not 300.
    const summary = daySummary([{ kcal: 100.5 }, { kcal: 100.5 }, { kcal: 100.5 }], 600);
    expect(summary.consumedKcal).toBeCloseTo(301.5, 10);
    expect(formatKcal(summary.consumedKcal)).toBe('302');
    expect(summary.remainingKcal).toBeCloseTo(298.5, 10);
  });

  it('PAI-03: exactly at the limit is not over', () => {
    const summary = daySummary([{ kcal: 600 }], 600);
    expect(summary.status).toBe('remaining');
    expect(summary.remainingKcal).toBe(0);
    expect(summary.overKcal).toBe(0);
  });

  it('PAI-03: reports the amount over the limit', () => {
    const summary = daySummary([{ kcal: 400 }, { kcal: 245 }], 600);
    expect(summary.status).toBe('over');
    expect(summary.overKcal).toBe(45);
    expect(summary.remainingKcal).toBe(0);
  });

  it('PAI-03, LAS-03: a fraction of a kcal over is not shown as "over by 0 kcal"', () => {
    const justOver = daySummary([{ kcal: 600.3 }], 600);
    expect(justOver.status).toBe('remaining');
    expect(roundKcal(justOver.remainingKcal)).toBe(0);
    expect(justOver.differenceKcal).toBeCloseTo(0.3, 10);

    const halfOver = daySummary([{ kcal: 600.5 }], 600);
    expect(halfOver.status).toBe('over');
    expect(formatKcal(halfOver.overKcal)).toBe('1');
  });

  it('rejects an invalid limit', () => {
    expect(() => daySummary([], -1)).toThrow(RangeError);
    expect(() => daySummary([], Number.NaN)).toThrow(RangeError);
  });
});

describe('formatKcal (LAS-03)', () => {
  it('LAS-03: rounds for display only', () => {
    expect(formatKcal(119.6)).toBe('120');
    expect(formatKcal(120.4)).toBe('120');
    expect(formatKcal(0.4)).toBe('0');
  });

  it('groups thousands with a no-break space', () => {
    expect(formatKcal(1234.4)).toBe('1 234');
    expect(formatKcal(1_000_000)).toBe('1 000 000');
    expect(formatKcal(999)).toBe('999');
  });

  it('never shows negative zero', () => {
    expect(formatKcal(-0.4)).toBe('0');
    expect(formatKcal(-45)).toBe('−45');
  });

  it('rejects non-finite values', () => {
    expect(() => formatKcal(Number.NaN)).toThrow(RangeError);
  });
});
