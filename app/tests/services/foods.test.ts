import { beforeEach, describe, expect, it } from 'vitest';

import type { ServiceContext } from '@/services/context';
import { ServiceError } from '@/services/errors';
import { listFavorites } from '@/services/favorites';
import {
  createFood,
  deleteFood,
  getFood,
  listFoods,
  setFoodFavorite,
  updateFood,
} from '@/services/foods';
import { createMeal, deleteMeal, getMeal, listMeals, updateMeal } from '@/services/meals';

import { createTestContext } from '../helpers/db';

function expectServiceError(fn: () => unknown, code: ServiceError['code']) {
  expect(fn).toThrow(ServiceError);
  try {
    fn();
  } catch (error) {
    expect((error as ServiceError).code).toBe(code);
  }
}

describe('own foods (OMA-01, OMA-02, OMA-03, OMA-06)', () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ({ ctx } = createTestContext());
  });

  it('OMA-01: saves a food with a name, energy and basis as the user source', () => {
    const food = createFood(ctx, { id: 'f1', name: ' Rahka ', energyKcal: 64, basis: 'per_100g' });
    expect(food).toMatchObject({
      id: 'f1',
      source: 'user',
      name: 'Rahka',
      energyKcal: 64,
      energyBasis: 'per_100g',
      servingAmount: null,
      isFavorite: false,
      deletedAt: null,
    });
  });

  it('OMA-02: saves a default serving with its label', () => {
    const food = createFood(ctx, {
      name: 'Jogurtti',
      energyKcal: 70,
      basis: 'per_100g',
      servingAmount: 200,
      servingUnit: 'g',
      servingLabel: 'purkki',
    });
    expect(food).toMatchObject({ servingAmount: 200, servingUnit: 'g', servingLabel: 'purkki' });
  });

  it('OMA-01, LAS-04: rejects an invalid food', () => {
    expectServiceError(
      () => createFood(ctx, { name: '', energyKcal: 10, basis: 'per_100g' }),
      'invalid_input',
    );
    expectServiceError(
      () => createFood(ctx, { name: 'X', energyKcal: -1, basis: 'per_100g' }),
      'invalid_input',
    );
  });

  it('OMA-06: edits a food', () => {
    createFood(ctx, { id: 'f1', name: 'Rahka', energyKcal: 64, basis: 'per_100g' });
    const updated = updateFood(ctx, 'f1', {
      name: 'Maitorahka',
      energyKcal: 66,
      basis: 'per_100g',
    });
    expect(updated).toMatchObject({ name: 'Maitorahka', energyKcal: 66 });
  });

  it('lists own foods by name without deleted ones', () => {
    createFood(ctx, { id: 'b', name: 'banaani', energyKcal: 90, basis: 'per_100g' });
    createFood(ctx, { id: 'a', name: 'Appelsiini', energyKcal: 45, basis: 'per_100g' });
    createFood(ctx, { id: 'c', name: 'Cashew', energyKcal: 600, basis: 'per_100g' });
    deleteFood(ctx, 'c');
    expect(listFoods(ctx).map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('OMA-06: deletes softly, so the row stays readable for references', () => {
    createFood(ctx, { id: 'f1', name: 'Rahka', energyKcal: 64, basis: 'per_100g' });
    setFoodFavorite(ctx, 'f1', true);
    const deleted = deleteFood(ctx, 'f1');
    expect(deleted.deletedAt).toBe('2026-10-25T08:00:00.000Z');
    expect(getFood(ctx, 'f1')?.name).toBe('Rahka');
    expect(listFavorites(ctx)).toEqual([]);
    expect(deleteFood(ctx, 'f1')).toEqual(deleted);
    expectServiceError(
      () => updateFood(ctx, 'f1', { name: 'X', energyKcal: 1, basis: 'per_100g' }),
      'deleted',
    );
    expectServiceError(() => setFoodFavorite(ctx, 'f1', true), 'deleted');
  });

  it('reports a missing food', () => {
    expectServiceError(() => deleteFood(ctx, 'nope'), 'not_found');
  });
});

describe('favourite meals (OMA-04, OMA-06)', () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ({ ctx } = createTestContext());
    createFood(ctx, { id: 'rahka', name: 'Rahka', energyKcal: 64, basis: 'per_100g' });
    createFood(ctx, { id: 'maito', name: 'Maito', energyKcal: 38, basis: 'per_100ml' });
    createFood(ctx, {
      id: 'pulla',
      name: 'Pulla',
      energyKcal: 180,
      basis: 'per_serving',
      servingLabel: 'pulla',
    });
  });

  it('OMA-04: computes the meal energy from its items', () => {
    const details = createMeal(ctx, {
      id: 'm1',
      name: 'Aamupala',
      items: [
        { foodId: 'rahka', amount: 250, unit: 'g' },
        { foodId: 'maito', amount: 200, unit: 'ml' },
        { foodId: 'pulla', amount: 1, unit: 'serving' },
      ],
    });
    expect(details.meal).toMatchObject({ id: 'm1', name: 'Aamupala', isFavorite: true });
    expect(details.items.map((i) => i.food.name)).toEqual(['Rahka', 'Maito', 'Pulla']);
    expect(details.kcal).toBeCloseTo(160 + 76 + 180, 10);
  });

  it('OMA-04: validates name, items and units', () => {
    expectServiceError(
      () => createMeal(ctx, { name: ' ', items: [{ foodId: 'rahka', amount: 1, unit: 'g' }] }),
      'invalid_input',
    );
    expectServiceError(() => createMeal(ctx, { name: 'Tyhjä', items: [] }), 'invalid_input');
    expectServiceError(
      () => createMeal(ctx, { name: 'X', items: [{ foodId: 'rahka', amount: 0, unit: 'g' }] }),
      'invalid_amount',
    );
    expectServiceError(
      () => createMeal(ctx, { name: 'X', items: [{ foodId: 'rahka', amount: 100, unit: 'ml' }] }),
      'incompatible_unit',
    );
    expectServiceError(
      () => createMeal(ctx, { name: 'X', items: [{ foodId: 'nope', amount: 1, unit: 'g' }] }),
      'not_found',
    );
    expect(listMeals(ctx)).toEqual([]);
  });

  it('OMA-06: edits name and items', () => {
    createMeal(ctx, {
      id: 'm1',
      name: 'Aamupala',
      items: [{ foodId: 'rahka', amount: 100, unit: 'g' }],
    });
    const updated = updateMeal(ctx, 'm1', {
      name: 'Iso aamupala',
      items: [{ foodId: 'rahka', amount: 300, unit: 'g' }],
    });
    expect(updated.meal.name).toBe('Iso aamupala');
    expect(updated.items).toHaveLength(1);
    expect(updated.kcal).toBeCloseTo(192, 10);
  });

  it('OMA-06: a deleted food cannot be added to a meal but may stay in one', () => {
    createMeal(ctx, {
      id: 'm1',
      name: 'Aamupala',
      items: [{ foodId: 'rahka', amount: 100, unit: 'g' }],
    });
    deleteFood(ctx, 'rahka');
    expect(getMeal(ctx, 'm1')?.kcal).toBeCloseTo(64, 10);
    expect(
      updateMeal(ctx, 'm1', {
        name: 'Aamupala',
        items: [{ foodId: 'rahka', amount: 200, unit: 'g' }],
      }).kcal,
    ).toBeCloseTo(128, 10);
    expectServiceError(
      () => createMeal(ctx, { name: 'Uusi', items: [{ foodId: 'rahka', amount: 1, unit: 'g' }] }),
      'deleted',
    );
  });

  it('OMA-06: deletes a meal softly', () => {
    createMeal(ctx, {
      id: 'm1',
      name: 'Aamupala',
      items: [{ foodId: 'rahka', amount: 100, unit: 'g' }],
    });
    deleteMeal(ctx, 'm1');
    expect(listMeals(ctx)).toEqual([]);
    expect(getMeal(ctx, 'm1')?.meal.deletedAt).not.toBeNull();
    expectServiceError(
      () =>
        updateMeal(ctx, 'm1', { name: 'X', items: [{ foodId: 'rahka', amount: 1, unit: 'g' }] }),
      'deleted',
    );
  });
});

describe('favourites (OMA-03, LAA-02)', () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ({ ctx } = createTestContext());
  });

  it('OMA-03: lists favourite foods and meals by name with their default portions', () => {
    createFood(ctx, {
      id: 'jog',
      name: 'Jogurtti',
      energyKcal: 70,
      basis: 'per_100g',
      servingAmount: 200,
      servingUnit: 'g',
      servingLabel: 'purkki',
    });
    createFood(ctx, { id: 'rahka', name: 'Rahka', energyKcal: 64, basis: 'per_100g' });
    createFood(ctx, { id: 'muu', name: 'Ei suosikki', energyKcal: 1, basis: 'per_100g' });
    setFoodFavorite(ctx, 'jog', true);
    setFoodFavorite(ctx, 'rahka', true);
    createMeal(ctx, {
      id: 'm1',
      name: 'aamupala',
      items: [{ foodId: 'rahka', amount: 100, unit: 'g' }],
    });

    const favorites = listFavorites(ctx);
    expect(favorites.map((f) => [f.type, f.name, f.kcal])).toEqual([
      ['meal', 'aamupala', 64],
      ['food', 'Jogurtti', 140],
      // No serving: the amount must be entered before logging.
      ['food', 'Rahka', null],
    ]);
    expect(favorites[1]).toMatchObject({ defaultPortion: { amount: 1, unit: 'serving' } });
    expect(favorites[2]).toMatchObject({ defaultPortion: null });
    expect(favorites[0]).toMatchObject({ defaultPortion: { fraction: 1 } });
  });

  it('OMA-03: removing the favourite marking removes it from the list', () => {
    createFood(ctx, { id: 'f1', name: 'Rahka', energyKcal: 64, basis: 'per_serving' });
    setFoodFavorite(ctx, 'f1', true);
    expect(listFavorites(ctx)).toHaveLength(1);
    setFoodFavorite(ctx, 'f1', false);
    expect(listFavorites(ctx)).toEqual([]);
  });
});
