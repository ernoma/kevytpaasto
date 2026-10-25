import { describe, expect, it } from 'vitest';

import { daySummary } from '@/domain/daySummary';
import { allowedUnits, computeKcal, hasDefaultServing, mealKcal } from '@/domain/portion';

const per100g = { energyKcal: 80, basis: 'per_100g' as const };
const per100ml = { energyKcal: 42, basis: 'per_100ml' as const };

describe('computeKcal (KIR-03, KIR-04, LAS-02, LAS-03)', () => {
  it('criterion 2: 150 g of a food with 80 kcal/100 g is 120 kcal; 480 kcal left of 600', () => {
    const result = computeKcal({ ...per100g, amount: 150, unit: 'g' });
    expect(result).toEqual({ ok: true, kcal: 120 });
    const summary = daySummary([{ kcal: result.ok ? result.kcal : NaN }], 600);
    expect(summary).toMatchObject({ consumedKcal: 120, status: 'remaining', remainingKcal: 480 });
  });

  it('LAS-02: computes per 100 ml from millilitres', () => {
    expect(computeKcal({ ...per100ml, amount: 250, unit: 'ml' })).toEqual({ ok: true, kcal: 105 });
  });

  it('LAS-02: never converts grams to millilitres or back', () => {
    expect(computeKcal({ ...per100g, amount: 100, unit: 'ml' })).toEqual({
      ok: false,
      error: 'incompatible_unit',
    });
    expect(computeKcal({ ...per100ml, amount: 100, unit: 'g' })).toEqual({
      ok: false,
      error: 'incompatible_unit',
    });
  });

  it('OMA-02: a serving of a per-100 g food uses the serving size in grams', () => {
    const serving = { amount: 200, unit: 'g' as const, label: 'purkki' };
    expect(computeKcal({ ...per100g, serving, amount: 1, unit: 'serving' })).toEqual({
      ok: true,
      kcal: 160,
    });
    expect(computeKcal({ ...per100g, serving, amount: 1.5, unit: 'serving' })).toEqual({
      ok: true,
      kcal: 240,
    });
  });

  it('LAS-02: a serving measured in ml cannot be used with energy per 100 g', () => {
    const serving = { amount: 200, unit: 'ml' as const };
    expect(computeKcal({ ...per100g, serving, amount: 1, unit: 'serving' })).toEqual({
      ok: false,
      error: 'incompatible_unit',
    });
  });

  it('a serving without a known size cannot be used with energy per 100 g', () => {
    expect(computeKcal({ ...per100g, amount: 1, unit: 'serving' })).toEqual({
      ok: false,
      error: 'missing_serving',
    });
  });

  it('LAS-02: energy per serving is multiplied by the number of servings', () => {
    const food = { energyKcal: 150, basis: 'per_serving' as const, serving: null };
    expect(computeKcal({ ...food, amount: 2, unit: 'serving' })).toEqual({ ok: true, kcal: 300 });
    expect(computeKcal({ ...food, amount: 50, unit: 'g' })).toEqual({
      ok: false,
      error: 'missing_serving',
    });
  });

  it('LAS-02: energy per serving can be logged in the serving unit when its size is known', () => {
    const food = {
      energyKcal: 150,
      basis: 'per_serving' as const,
      serving: { amount: 60, unit: 'g' as const },
    };
    expect(computeKcal({ ...food, amount: 30, unit: 'g' })).toEqual({ ok: true, kcal: 75 });
    expect(computeKcal({ ...food, amount: 30, unit: 'ml' })).toEqual({
      ok: false,
      error: 'incompatible_unit',
    });
  });

  it('LAS-03: keeps the result unrounded', () => {
    const result = computeKcal({ energyKcal: 33, basis: 'per_100g', amount: 33, unit: 'g' });
    expect(result.ok && result.kcal).toBeCloseTo(10.89, 10);
  });

  it('HAK-04, LAS-07: missing energy is an error, not 0', () => {
    expect(computeKcal({ energyKcal: null, basis: 'per_100g', amount: 100, unit: 'g' })).toEqual({
      ok: false,
      error: 'missing_energy',
    });
    expect(computeKcal({ energyKcal: 80, basis: null, amount: 100, unit: 'g' })).toEqual({
      ok: false,
      error: 'missing_energy',
    });
  });

  it('LAS-04: zero energy and zero amount are allowed; negative values are not', () => {
    expect(computeKcal({ energyKcal: 0, basis: 'per_100g', amount: 100, unit: 'g' })).toEqual({
      ok: true,
      kcal: 0,
    });
    expect(computeKcal({ ...per100g, amount: 0, unit: 'g' })).toEqual({ ok: true, kcal: 0 });
    expect(computeKcal({ ...per100g, amount: -1, unit: 'g' })).toEqual({
      ok: false,
      error: 'invalid_amount',
    });
    expect(computeKcal({ ...per100g, amount: NaN, unit: 'g' })).toEqual({
      ok: false,
      error: 'invalid_amount',
    });
    expect(computeKcal({ energyKcal: -5, basis: 'per_100g', amount: 1, unit: 'g' }).ok).toBe(false);
  });
});

describe('allowedUnits (KIR-03, LAS-02)', () => {
  it('offers the basis unit and a serving only when its size is in the same unit', () => {
    expect(allowedUnits({ basis: 'per_100g' })).toEqual(['g']);
    expect(allowedUnits({ basis: 'per_100g', serving: { amount: 200, unit: 'g' } })).toEqual([
      'g',
      'serving',
    ]);
    expect(allowedUnits({ basis: 'per_100ml', serving: { amount: 200, unit: 'g' } })).toEqual([
      'ml',
    ]);
  });

  it('offers servings for energy per serving, and the serving unit when its size is known', () => {
    expect(allowedUnits({ basis: 'per_serving' })).toEqual(['serving']);
    expect(allowedUnits({ basis: 'per_serving', serving: { amount: 330, unit: 'ml' } })).toEqual([
      'ml',
      'serving',
    ]);
  });

  it('offers nothing without an energy basis (LAS-07)', () => {
    expect(allowedUnits({ basis: null })).toEqual([]);
  });

  it('OMA-03: hasDefaultServing tells whether one serving can be logged directly', () => {
    expect(hasDefaultServing({ basis: 'per_100g' })).toBe(false);
    expect(hasDefaultServing({ basis: 'per_100g', serving: { amount: 200, unit: 'g' } })).toBe(
      true,
    );
    expect(hasDefaultServing({ basis: 'per_serving' })).toBe(true);
  });
});

describe('mealKcal (OMA-04, OMA-05)', () => {
  const items = [
    { ...per100g, amount: 150, unit: 'g' as const },
    { ...per100ml, amount: 200, unit: 'ml' as const },
    { energyKcal: 50, basis: 'per_serving' as const, amount: 2, unit: 'serving' as const },
  ];

  it('OMA-04: sums the energy of the items', () => {
    expect(mealKcal(items)).toEqual({ ok: true, kcal: 120 + 84 + 100 });
  });

  it('OMA-05: multiplies by the share eaten', () => {
    expect(mealKcal(items, 0.5)).toEqual({ ok: true, kcal: 152 });
  });

  it('rejects a zero, negative or non-finite share', () => {
    expect(mealKcal(items, 0).ok).toBe(false);
    expect(mealKcal(items, -1).ok).toBe(false);
    expect(mealKcal(items, Infinity).ok).toBe(false);
  });

  it('LAS-07: one item without energy makes the meal energy unknown', () => {
    expect(
      mealKcal([...items, { energyKcal: null, basis: 'per_100g', amount: 10, unit: 'g' }]),
    ).toEqual({ ok: false, error: 'missing_energy' });
  });
});
