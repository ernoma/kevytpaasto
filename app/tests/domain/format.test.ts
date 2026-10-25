import { describe, expect, it } from 'vitest';

import { formatAmountInput, formatDateFi } from '@/domain/format';

describe('formatDateFi (PAI-02, PAI-05)', () => {
  it('PAI-02: shows the weekday and the date without leading zeros', () => {
    expect(formatDateFi('2026-10-25')).toBe('su 25.10.2026');
    expect(formatDateFi('2026-03-02')).toBe('ma 2.3.2026');
    expect(formatDateFi('2028-02-29')).toBe('ti 29.2.2028');
  });

  it('PAI-05: rejects anything other than YYYY-MM-DD', () => {
    expect(() => formatDateFi('2026-10-25T10:00:00Z')).toThrow(RangeError);
  });
});

describe('formatAmountInput (LAS-05)', () => {
  it('LAS-05: uses a decimal comma', () => {
    expect(formatAmountInput(12.5)).toBe('12,5');
    expect(formatAmountInput(120)).toBe('120');
  });
});
