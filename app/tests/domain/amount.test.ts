import { describe, expect, it } from 'vitest';

import { parseAmount } from '@/domain/amount';
import { parseLimit } from '@/domain/limit';

describe('parseAmount (LAS-04, LAS-05)', () => {
  it('LAS-05: accepts a decimal comma', () => {
    expect(parseAmount('12,5')).toEqual({ ok: true, value: 12.5 });
    expect(parseAmount(',5')).toEqual({ ok: true, value: 0.5 });
  });

  it('LAS-05: accepts a decimal point and surrounding whitespace', () => {
    expect(parseAmount('12.5')).toEqual({ ok: true, value: 12.5 });
    expect(parseAmount(' 120 ')).toEqual({ ok: true, value: 120 });
    expect(parseAmount('7,')).toEqual({ ok: true, value: 7 });
  });

  it('LAS-04: accepts an intentional zero', () => {
    expect(parseAmount('0')).toEqual({ ok: true, value: 0 });
    expect(parseAmount('-0')).toEqual({ ok: true, value: 0 });
  });

  it('LAS-04: rejects an empty value', () => {
    expect(parseAmount('')).toEqual({ ok: false, error: 'empty' });
    expect(parseAmount('   ')).toEqual({ ok: false, error: 'empty' });
  });

  it('LAS-04: rejects a negative value', () => {
    expect(parseAmount('-5')).toEqual({ ok: false, error: 'negative' });
    expect(parseAmount('-0,5')).toEqual({ ok: false, error: 'negative' });
  });

  it('LAS-04: rejects malformed values', () => {
    for (const text of [
      'abc',
      '1,2,3',
      '1.000,5',
      '1e3',
      'Infinity',
      'NaN',
      '12 kcal',
      '+5',
      '.',
      ',',
    ]) {
      expect(parseAmount(text), text).toEqual({ ok: false, error: 'invalid' });
    }
  });
});

describe('parseLimit (KAY-01)', () => {
  it('KAY-01: accepts a positive limit with a decimal comma', () => {
    expect(parseLimit('600')).toEqual({ ok: true, value: 600 });
    expect(parseLimit('500,5')).toEqual({ ok: true, value: 500.5 });
  });

  it('KAY-01: rejects zero, empty and negative limits', () => {
    expect(parseLimit('0')).toEqual({ ok: false, error: 'zero' });
    expect(parseLimit('')).toEqual({ ok: false, error: 'empty' });
    expect(parseLimit('-600')).toEqual({ ok: false, error: 'negative' });
  });
});
