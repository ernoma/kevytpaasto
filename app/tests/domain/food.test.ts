import { describe, expect, it } from 'vitest';

import { normalizeText, validateFood, type FoodInput } from '@/domain/food';

const valid: FoodInput = { name: 'Rahka', energyKcal: 64, basis: 'per_100g' };

describe('validateFood (OMA-01, OMA-02)', () => {
  it('OMA-01: a name, energy and its basis are enough', () => {
    expect(validateFood(valid)).toEqual([]);
    expect(validateFood({ ...valid, energyKcal: 150, basis: 'per_serving' })).toEqual([]);
  });

  it('OMA-01: requires a non-blank name', () => {
    expect(validateFood({ ...valid, name: '  ' })).toEqual([{ field: 'name', error: 'empty' }]);
  });

  it('LAS-04: rejects negative or non-finite energy but accepts zero', () => {
    expect(validateFood({ ...valid, energyKcal: -1 })).toEqual([
      { field: 'energyKcal', error: 'invalid' },
    ]);
    expect(validateFood({ ...valid, energyKcal: NaN })).toEqual([
      { field: 'energyKcal', error: 'invalid' },
    ]);
    expect(validateFood({ ...valid, energyKcal: 0 })).toEqual([]);
  });

  it('OMA-02: accepts a default serving with a size and a label', () => {
    expect(
      validateFood({ ...valid, servingAmount: 200, servingUnit: 'g', servingLabel: 'purkki' }),
    ).toEqual([]);
  });

  it('OMA-02: a serving size needs both an amount and a unit', () => {
    expect(validateFood({ ...valid, servingAmount: 200 })).toEqual([
      { field: 'servingUnit', error: 'missing' },
    ]);
    expect(validateFood({ ...valid, servingUnit: 'g' })).toEqual([
      { field: 'servingAmount', error: 'missing' },
    ]);
    expect(validateFood({ ...valid, servingAmount: 0, servingUnit: 'g' })).toEqual([
      { field: 'servingAmount', error: 'invalid' },
    ]);
  });

  it('LAS-02: the serving unit must match a per-100 g or per-100 ml basis', () => {
    expect(validateFood({ ...valid, servingAmount: 200, servingUnit: 'ml' })).toEqual([
      { field: 'servingUnit', error: 'incompatible' },
    ]);
    expect(
      validateFood({ ...valid, basis: 'per_serving', servingAmount: 200, servingUnit: 'ml' }),
    ).toEqual([]);
  });
});

describe('normalizeText', () => {
  it('trims and turns blank into null', () => {
    expect(normalizeText(' purkki ')).toBe('purkki');
    expect(normalizeText('  ')).toBeNull();
    expect(normalizeText(undefined)).toBeNull();
  });
});
