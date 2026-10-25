import { describe, expect, it } from 'vitest';

import {
  evaluatePortion,
  initialPortion,
  parseOptionalAmount,
  parsePositiveAmount,
} from '@/domain/portionForm';

const per100g = { energyKcal: 80, basis: 'per_100g' as const };
const yogurt = {
  energyKcal: 70,
  basis: 'per_100g' as const,
  serving: { amount: 200, unit: 'g' as const, label: 'purkki' },
};

describe('parsePositiveAmount (LAS-05)', () => {
  it('accepts a decimal comma', () => {
    expect(parsePositiveAmount('0,5')).toEqual({ ok: true, value: 0.5 });
  });

  it('rejects zero, blank and malformed amounts', () => {
    expect(parsePositiveAmount('0')).toEqual({ ok: false, error: 'zero' });
    expect(parsePositiveAmount(' ')).toEqual({ ok: false, error: 'empty' });
    expect(parsePositiveAmount('1,2,3')).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('parseOptionalAmount (OMA-02)', () => {
  it('treats a blank serving size as missing, not zero', () => {
    expect(parseOptionalAmount('')).toEqual({ ok: true, value: null });
    expect(parseOptionalAmount('200')).toEqual({ ok: true, value: 200 });
    expect(parseOptionalAmount('0')).toEqual({ ok: false, error: 'zero' });
  });
});

describe('evaluatePortion (KIR-03, KIR-04)', () => {
  it('criterion 2: shows 120 kcal for 150 g of 80 kcal/100 g before saving', () => {
    expect(evaluatePortion(per100g, '150', 'g')).toEqual({ ok: true, amount: 150, kcal: 120 });
  });

  it('computes a serving and a share of a meal', () => {
    expect(evaluatePortion(yogurt, '1', 'serving')).toEqual({ ok: true, amount: 1, kcal: 140 });
    const meal = { energyKcal: 216, basis: 'per_serving' as const };
    expect(evaluatePortion(meal, '0,5', 'serving')).toEqual({ ok: true, amount: 0.5, kcal: 108 });
  });

  it('LAS-02, LAS-07: reports unusable units and missing energy instead of a number', () => {
    expect(evaluatePortion(per100g, '100', 'ml')).toEqual({
      ok: false,
      error: 'incompatible_unit',
    });
    expect(evaluatePortion({ energyKcal: null, basis: null }, '100', 'g')).toEqual({
      ok: false,
      error: 'missing_energy',
    });
    expect(evaluatePortion(per100g, '', 'g')).toEqual({ ok: false, error: 'empty' });
  });
});

describe('initialPortion (OMA-03)', () => {
  it('starts from one serving when the food has one', () => {
    expect(initialPortion(yogurt)).toEqual({ unit: 'serving', amount: 1 });
  });

  it('starts from the basis unit without an amount otherwise', () => {
    expect(initialPortion(per100g)).toEqual({ unit: 'g', amount: null });
    expect(initialPortion({ basis: null })).toBeNull();
  });
});
