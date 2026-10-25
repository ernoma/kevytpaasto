import { count } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { publishJob } from '@/db/schema';
import type { ServiceContext } from '@/services/context';
import { ServiceError } from '@/services/errors';
import { getDayView, getFastDay, startFastDay, type FastDay } from '@/services/fastDays';
import { createFood, deleteFood, updateFood } from '@/services/foods';
import {
  deleteEntry,
  getEntry,
  saveFoodEntry,
  saveMealEntry,
  saveQuickEntry,
  updateFoodEntry,
  updateMealEntry,
} from '@/services/logEntries';
import { createMeal, deleteMeal, updateMeal } from '@/services/meals';
import { setDefaultLimit } from '@/services/settings';

import { createTestContext } from '../helpers/db';

function expectServiceError(fn: () => unknown, code: ServiceError['code']) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceError);
    expect((error as ServiceError).code).toBe(code);
    return;
  }
  expect.fail(`Expected ServiceError ${code}`);
}

describe('logging foods and meals (KIR-03, KIR-04, KIR-08, OMA-03…07)', () => {
  let ctx: ServiceContext;
  let advance: (ms?: number) => void;
  let day: FastDay;

  beforeEach(() => {
    ({ ctx, advance } = createTestContext());
    setDefaultLimit(ctx, 600);
    day = startFastDay(ctx, '2026-10-25');
    createFood(ctx, { id: 'tuote', name: 'Tuote', energyKcal: 80, basis: 'per_100g' });
    createFood(ctx, {
      id: 'jog',
      name: 'Jogurtti',
      energyKcal: 70,
      basis: 'per_100g',
      servingAmount: 200,
      servingUnit: 'g',
      servingLabel: 'purkki',
    });
    createFood(ctx, { id: 'maito', name: 'Maito', energyKcal: 38, basis: 'per_100ml' });
  });

  it('criterion 2: 150 g of 80 kcal/100 g is 120 kcal; with a 600 kcal limit 480 kcal is left', () => {
    const entry = saveFoodEntry(ctx, {
      id: 'e1',
      fastDayId: day.id,
      foodId: 'tuote',
      amount: 150,
      unit: 'g',
    });
    expect(entry.kcal).toBe(120);
    expect(getDayView(ctx, '2026-10-25').summary).toMatchObject({
      consumedKcal: 120,
      limitKcal: 600,
      status: 'remaining',
      remainingKcal: 480,
    });
  });

  it('KIR-08: stores the food data as a snapshot with provenance', () => {
    const entry = saveFoodEntry(ctx, {
      id: 'e1',
      fastDayId: day.id,
      foodId: 'jog',
      amount: 1,
      unit: 'serving',
    });
    expect(entry).toMatchObject({
      name: 'Jogurtti',
      amount: 1,
      unit: 'serving',
      energyKcalPerBasis: 70,
      energyBasis: 'per_100g',
      servingAmount: 200,
      servingUnit: 'g',
      servingLabel: 'purkki',
      kcal: 140,
      originType: 'food',
      originId: 'jog',
      mealFraction: null,
    });
  });

  it('LAS-02: rejects grams for a per-100 ml food', () => {
    expectServiceError(
      () =>
        saveFoodEntry(ctx, {
          id: 'e1',
          fastDayId: day.id,
          foodId: 'maito',
          amount: 100,
          unit: 'g',
        }),
      'incompatible_unit',
    );
    expect(getEntry(ctx, 'e1')).toBeNull();
  });

  it('LAS-04: rejects a negative amount', () => {
    expectServiceError(
      () =>
        saveFoodEntry(ctx, { id: 'e1', fastDayId: day.id, foodId: 'tuote', amount: -1, unit: 'g' }),
      'invalid_amount',
    );
  });

  it('KIR-07: saving the same form twice keeps one row and updates the amount', () => {
    const input = { id: 'e1', fastDayId: day.id, foodId: 'tuote', amount: 150, unit: 'g' as const };
    saveFoodEntry(ctx, input);
    saveFoodEntry(ctx, { ...input, amount: 200 });
    const view = getDayView(ctx, '2026-10-25');
    expect(view.entries).toHaveLength(1);
    expect(view.entries[0]?.kcal).toBe(160);
  });

  it('KIR-07: a form id used by another kind of entry is not overwritten', () => {
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 100 });
    expectServiceError(
      () =>
        saveFoodEntry(ctx, { id: 'e1', fastDayId: day.id, foodId: 'tuote', amount: 1, unit: 'g' }),
      'origin_mismatch',
    );
  });

  it('KIR-05: changing the amount recomputes energy from the snapshot', () => {
    saveFoodEntry(ctx, { id: 'e1', fastDayId: day.id, foodId: 'jog', amount: 1, unit: 'serving' });
    advance();
    const updated = updateFoodEntry(ctx, 'e1', { amount: 150, unit: 'g' });
    expect(updated).toMatchObject({ amount: 150, unit: 'g', kcal: 105 });
    expect(updated.updatedAt).not.toBe(updated.createdAt);
  });

  it('OMA-06: a deleted food cannot be logged', () => {
    deleteFood(ctx, 'tuote');
    expectServiceError(
      () =>
        saveFoodEntry(ctx, { id: 'e1', fastDayId: day.id, foodId: 'tuote', amount: 1, unit: 'g' }),
      'deleted',
    );
  });

  it('requires an existing fast day and food', () => {
    expectServiceError(
      () =>
        saveFoodEntry(ctx, { id: 'e1', fastDayId: 'nope', foodId: 'tuote', amount: 1, unit: 'g' }),
      'not_found',
    );
    expectServiceError(
      () =>
        saveFoodEntry(ctx, { id: 'e1', fastDayId: day.id, foodId: 'nope', amount: 1, unit: 'g' }),
      'not_found',
    );
  });

  describe('meals', () => {
    beforeEach(() => {
      createMeal(ctx, {
        id: 'm1',
        name: 'Aamupala',
        items: [
          { foodId: 'jog', amount: 1, unit: 'serving' },
          { foodId: 'maito', amount: 200, unit: 'ml' },
        ],
      });
    });

    it('OMA-04: logs a whole meal as one entry with its computed energy', () => {
      const entry = saveMealEntry(ctx, { id: 'e1', fastDayId: day.id, mealId: 'm1', fraction: 1 });
      expect(entry).toMatchObject({
        name: 'Aamupala',
        amount: 1,
        unit: 'serving',
        energyBasis: 'per_serving',
        originType: 'meal',
        originId: 'm1',
        mealFraction: 1,
      });
      expect(entry.energyKcalPerBasis).toBeCloseTo(216, 10);
      expect(entry.kcal).toBeCloseTo(216, 10);
    });

    it('OMA-05: logs a share of a meal and changes it from the snapshot', () => {
      const entry = saveMealEntry(ctx, {
        id: 'e1',
        fastDayId: day.id,
        mealId: 'm1',
        fraction: 0.5,
      });
      expect(entry.kcal).toBeCloseTo(108, 10);
      const updated = updateMealEntry(ctx, 'e1', { fraction: 0.25 });
      expect(updated).toMatchObject({ amount: 0.25, mealFraction: 0.25 });
      expect(updated.kcal).toBeCloseTo(54, 10);
    });

    it('OMA-05: rejects a zero or negative share', () => {
      expectServiceError(
        () => saveMealEntry(ctx, { id: 'e1', fastDayId: day.id, mealId: 'm1', fraction: 0 }),
        'invalid_amount',
      );
    });

    it('KIR-07: saving the same meal form twice keeps one row', () => {
      saveMealEntry(ctx, { id: 'e1', fastDayId: day.id, mealId: 'm1', fraction: 1 });
      saveMealEntry(ctx, { id: 'e1', fastDayId: day.id, mealId: 'm1', fraction: 1 });
      expect(getDayView(ctx, '2026-10-25').entries).toHaveLength(1);
    });

    it('OMA-06: a deleted meal cannot be logged', () => {
      deleteMeal(ctx, 'm1');
      expectServiceError(
        () => saveMealEntry(ctx, { id: 'e1', fastDayId: day.id, mealId: 'm1', fraction: 1 }),
        'deleted',
      );
    });

    it('LAA-02: logging the default portion can be undone by deleting the entry', () => {
      saveMealEntry(ctx, { id: 'e1', fastDayId: day.id, mealId: 'm1', fraction: 1 });
      deleteEntry(ctx, 'e1');
      expect(getDayView(ctx, '2026-10-25').entries).toEqual([]);
    });
  });

  it('criterion 7: own foods and meals are saved and logged without publishing (OMA-07)', () => {
    createMeal(ctx, {
      id: 'resepti',
      name: 'Oma resepti',
      items: [{ foodId: 'tuote', amount: 300, unit: 'g' }],
    });
    saveFoodEntry(ctx, { id: 'e1', fastDayId: day.id, foodId: 'tuote', amount: 100, unit: 'g' });
    saveMealEntry(ctx, { id: 'e2', fastDayId: day.id, mealId: 'resepti', fraction: 1 });
    expect(getDayView(ctx, '2026-10-25').summary?.consumedKcal).toBe(80 + 240);
    expect(ctx.db.select({ value: count() }).from(publishJob).get()?.value).toBe(0);
  });

  it('criterion 10: changing or deleting a food, a meal or the default limit keeps old entries and limits', () => {
    createMeal(ctx, {
      id: 'm1',
      name: 'Aamupala',
      items: [{ foodId: 'tuote', amount: 100, unit: 'g' }],
    });
    saveFoodEntry(ctx, { id: 'e1', fastDayId: day.id, foodId: 'jog', amount: 1, unit: 'serving' });
    saveMealEntry(ctx, { id: 'e2', fastDayId: day.id, mealId: 'm1', fraction: 1 });
    const before = getDayView(ctx, '2026-10-25');

    advance();
    updateFood(ctx, 'jog', {
      name: 'Kreikkalainen jogurtti',
      energyKcal: 120,
      basis: 'per_100g',
      servingAmount: 150,
      servingUnit: 'g',
      servingLabel: 'pikari',
    });
    updateFood(ctx, 'tuote', { name: 'Tuote', energyKcal: 200, basis: 'per_100g' });
    updateMeal(ctx, 'm1', {
      name: 'Iso aamupala',
      items: [{ foodId: 'tuote', amount: 300, unit: 'g' }],
    });
    setDefaultLimit(ctx, 800);

    expect(getDayView(ctx, '2026-10-25')).toEqual(before);

    deleteFood(ctx, 'jog');
    deleteMeal(ctx, 'm1');
    expect(getDayView(ctx, '2026-10-25')).toEqual(before);
    expect(getFastDay(ctx, '2026-10-25')?.limitKcal).toBe(600);

    // Editing an old entry still uses its own snapshot, not the changed food.
    expect(updateFoodEntry(ctx, 'e1', { amount: 2, unit: 'serving' }).kcal).toBe(280);
    expect(updateMealEntry(ctx, 'e2', { fraction: 0.5 }).kcal).toBe(40);
  });
});
