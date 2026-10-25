import { beforeEach, describe, expect, it } from 'vitest';

import type { ServiceContext } from '@/services/context';
import { ServiceError } from '@/services/errors';
import { getDayView, startFastDay, type FastDay } from '@/services/fastDays';
import { findFineliCopy, getFineliFood, isFineliAvailable, searchFineli } from '@/services/fineli';
import { createFood, getFood } from '@/services/foods';
import { getEntry, saveFineliEntry, updateFoodEntry } from '@/services/logEntries';
import { searchFoods } from '@/services/search';
import { setDefaultLimit } from '@/services/settings';

import { createTestContext } from '../helpers/db';
import { attachFineliFixture } from '../helpers/fineli';

const KJ = 4.184;
const portion = { amount: 250, unit: 'g' as const, label: 'keskikokoinen annos' };

describe('Fineli search and logging (HAK-02, HAK-03, HAK-04, LAS-06)', () => {
  let ctx: ServiceContext;
  let advance: (ms?: number) => void;
  let day: FastDay;

  beforeEach(() => {
    const test = createTestContext();
    ({ ctx, advance } = test);
    attachFineliFixture(test.sqlite);
    setDefaultLimit(ctx, 600);
    day = startFastDay(ctx, '2026-10-25');
  });

  it('HAK-02: finds an ingredient by the start of its name, plain food first', () => {
    const names = searchFineli(ctx, 'omena').map((f) => f.name);
    expect(names).toEqual(['Omena, kotimainen, kuorittu', 'Omenahillo']);
  });

  it('HAK-02: matches every word as a prefix and compounds by substring', () => {
    expect(searchFineli(ctx, 'banaani kuor').map((f) => f.name)).toEqual([
      'Banaani, kuorittu',
      'Banaani, punnittu kuorineen',
    ]);
    expect(searchFineli(ctx, 'puuro').map((f) => f.name)).toEqual(['Kaurapuuro, vesi, suolaa']);
    expect(searchFineli(ctx, 'ÄYRI').map((f) => f.name)).toEqual(['Äyriäiskeitto']);
  });

  it('ignores too short input and FTS syntax', () => {
    expect(searchFineli(ctx, 'o')).toEqual([]);
    expect(searchFineli(ctx, '"omena" OR')).toEqual([]);
    expect(() => searchFineli(ctx, '*"(')).not.toThrow();
  });

  it('HAK-03, LAS-06: returns energy per 100 g and the preparation method', () => {
    const [porridge] = searchFineli(ctx, 'kaurapuuro');
    expect(porridge).toMatchObject({
      energyKcal: 200.832 / KJ,
      processFi: 'Keitetty',
      preparationState: 'cooked',
      foodType: 'DISH',
    });
  });

  it('HAK-04: missing energy is null, not 0', () => {
    const [water] = searchFineli(ctx, 'vesi keitetty');
    expect(water?.name).toBe('Vesi, keitetty');
    expect(water?.energyKcal).toBeNull();
  });

  it('returns household units of a food', () => {
    expect(getFineliFood(ctx, 3)?.servings).toEqual([
      { unit: 'PORTS', massG: 150 },
      { unit: 'PORTM', massG: 250 },
      { unit: 'DL', massG: 100 },
    ]);
    expect(getFineliFood(ctx, 999)).toBeNull();
  });

  it('searches own foods and Fineli together', () => {
    createFood(ctx, { name: 'Omenapiirakka', brand: 'Mummon', energyKcal: 250, basis: 'per_100g' });
    const results = searchFoods(ctx, 'omena');
    expect(results.fineliAvailable).toBe(true);
    expect(results.own.map((f) => f.name)).toEqual(['Omenapiirakka']);
    expect(results.fineli.map((f) => f.name)).toContain('Omenahillo');
    expect(searchFoods(ctx, 'mummon').own).toHaveLength(1);
  });

  it('KIR-08: copies the food on the first entry and snapshots the chosen serving', () => {
    expect(findFineliCopy(ctx, 3)).toBeNull();
    const entry = saveFineliEntry(ctx, {
      id: 'e1',
      fastDayId: day.id,
      fineliId: 3,
      amount: 1,
      unit: 'serving',
      serving: { amount: 100, unit: 'g', label: 'desilitra' },
      defaultServing: portion,
    });
    const copy = findFineliCopy(ctx, 3)!;
    expect(copy).toMatchObject({
      source: 'fineli',
      sourceRef: '3',
      name: 'Kaurapuuro, vesi, suolaa',
      energyKcal: 200.832 / KJ,
      energyBasis: 'per_100g',
      servingAmount: 250,
      servingUnit: 'g',
      servingLabel: 'keskikokoinen annos',
      preparationState: 'cooked',
      fetchedAt: '2026-10-25T08:00:00.000Z',
    });
    expect(entry).toMatchObject({
      name: 'Kaurapuuro, vesi, suolaa',
      amount: 1,
      unit: 'serving',
      energyKcalPerBasis: 200.832 / KJ,
      energyBasis: 'per_100g',
      servingAmount: 100,
      servingUnit: 'g',
      servingLabel: 'desilitra',
      originType: 'food',
      originId: copy.id,
    });
    expect(entry.kcal).toBeCloseTo(48, 10);
    expect(getDayView(ctx, day.date)?.summary?.consumedKcal).toBeCloseTo(48, 10);
  });

  it('reuses the copy on later entries', () => {
    const save = (id: string) =>
      saveFineliEntry(ctx, {
        id,
        fastDayId: day.id,
        fineliId: 1,
        amount: 150,
        unit: 'g',
        serving: null,
        defaultServing: null,
      });
    const first = save('e1');
    advance();
    const second = save('e2');
    expect(second.originId).toBe(first.originId);
    expect(getFood(ctx, first.originId!)?.fetchedAt).toBe('2026-10-25T08:00:00.000Z');
    expect(first.kcal).toBeCloseTo(61.5, 10);
  });

  it('KIR-07: saving again with the same id updates the entry', () => {
    const input = {
      id: 'e1',
      fastDayId: day.id,
      fineliId: 5,
      amount: 100,
      unit: 'g' as const,
      serving: null,
      defaultServing: null,
    };
    saveFineliEntry(ctx, input);
    const again = saveFineliEntry(ctx, { ...input, amount: 200 });
    expect(again.kcal).toBeCloseTo(176, 10);
    expect(getDayView(ctx, day.date).entries).toHaveLength(1);
  });

  it('KIR-05: an entry is corrected from its own snapshot', () => {
    saveFineliEntry(ctx, {
      id: 'e1',
      fastDayId: day.id,
      fineliId: 3,
      amount: 1,
      unit: 'serving',
      serving: { amount: 100, unit: 'g', label: 'desilitra' },
      defaultServing: portion,
    });
    const corrected = updateFoodEntry(ctx, 'e1', { amount: 2, unit: 'serving' });
    expect(corrected.kcal).toBeCloseTo(96, 10);
    expect(getEntry(ctx, 'e1')?.servingLabel).toBe('desilitra');
  });

  it('HAK-04: a food without energy cannot be logged and is not copied', () => {
    expect(() =>
      saveFineliEntry(ctx, {
        id: 'e1',
        fastDayId: day.id,
        fineliId: 4,
        amount: 100,
        unit: 'g',
        serving: null,
        defaultServing: null,
      }),
    ).toThrow(ServiceError);
    expect(findFineliCopy(ctx, 4)).toBeNull();
    expect(getEntry(ctx, 'e1')).toBeNull();
  });

  it('rejects an unknown Fineli id', () => {
    expect(() =>
      saveFineliEntry(ctx, {
        id: 'e1',
        fastDayId: day.id,
        fineliId: 999,
        amount: 100,
        unit: 'g',
        serving: null,
        defaultServing: null,
      }),
    ).toThrow(/not found/);
  });
});

describe('without fineli.db', () => {
  it('still searches own foods', () => {
    const { ctx } = createTestContext();
    createFood(ctx, { name: 'Omenapiirakka', energyKcal: 250, basis: 'per_100g' });
    expect(isFineliAvailable(ctx)).toBe(false);
    expect(searchFoods(ctx, 'omena')).toMatchObject({ fineli: [], fineliAvailable: false });
    expect(searchFoods(ctx, 'omena').own).toHaveLength(1);
  });
});
