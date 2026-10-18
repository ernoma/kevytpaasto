import { describe, expect, it } from 'vitest';

import { KJ_PER_KCAL, kjToKcal } from '@/domain/energy';

describe('kjToKcal (LAS-01)', () => {
  it('LAS-01: divides kJ by 4.184', () => {
    expect(KJ_PER_KCAL).toBe(4.184);
    expect(kjToKcal(4.184)).toBe(1);
    expect(kjToKcal(418.4)).toBeCloseTo(100, 10);
  });

  it('LAS-03: does not round the result', () => {
    expect(kjToKcal(1000)).toBeCloseTo(239.0057361376673, 12);
  });

  it('LAS-04: accepts zero energy', () => {
    expect(kjToKcal(0)).toBe(0);
  });

  it('LAS-04: rejects negative and non-finite energy', () => {
    expect(() => kjToKcal(-1)).toThrow(RangeError);
    expect(() => kjToKcal(Number.NaN)).toThrow(RangeError);
    expect(() => kjToKcal(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
