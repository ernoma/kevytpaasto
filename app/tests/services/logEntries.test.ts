import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ServiceContext } from '@/services/context';
import { ServiceError } from '@/services/errors';
import { getDayView, startFastDay, type FastDay } from '@/services/fastDays';
import {
  deleteEntry,
  getEntry,
  moveEntry,
  saveQuickEntry,
  updateQuickEntry,
} from '@/services/logEntries';
import { setDefaultLimit } from '@/services/settings';

import { createTestContext } from '../helpers/db';

describe('quick entries (KIR-02, KIR-05, KIR-07)', () => {
  let ctx: ServiceContext;
  let advance: (ms?: number) => void;
  let day: FastDay;

  beforeEach(() => {
    ({ ctx, advance } = createTestContext());
    setDefaultLimit(ctx, 600);
    day = startFastDay(ctx, '2026-10-25');
  });

  it('KIR-02: energy alone is enough; the name is optional', () => {
    const entry = saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120 });
    expect(entry).toMatchObject({
      id: 'e1',
      fastDayId: day.id,
      name: null,
      amount: 120,
      unit: 'kcal',
      kcal: 120,
      energyKcalPerBasis: null,
      energyBasis: null,
      originType: 'quick',
      originId: null,
      createdAt: '2026-10-25T08:00:00.000Z',
    });
  });

  it('KIR-02: a name is trimmed and a blank name is stored as null', () => {
    expect(
      saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 1, name: '  Kahvi ' }).name,
    ).toBe('Kahvi');
    expect(
      saveQuickEntry(ctx, { id: 'e2', fastDayId: day.id, kcal: 1, name: '   ' }).name,
    ).toBeNull();
  });

  it('LAS-03: stores energy unrounded', () => {
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 119.6 });
    expect(getEntry(ctx, 'e1')?.kcal).toBe(119.6);
  });

  it('LAS-04: accepts an intentional zero and rejects negative or non-finite energy', () => {
    expect(saveQuickEntry(ctx, { id: 'zero', fastDayId: day.id, kcal: 0 }).kcal).toBe(0);
    for (const kcal of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => saveQuickEntry(ctx, { id: `bad-${kcal}`, fastDayId: day.id, kcal })).toThrow(
        expect.objectContaining({ code: 'invalid_amount' }),
      );
    }
    expect(getDayView(ctx, day.date).entries).toHaveLength(1);
  });

  it('PAI-04: an entry needs an existing fast day', () => {
    expect(() => saveQuickEntry(ctx, { id: 'e1', fastDayId: 'missing', kcal: 100 })).toThrow(
      expect.objectContaining({ code: 'not_found' }),
    );
  });

  it('KIR-07: saving the same form twice creates one entry', () => {
    const input = { id: 'form-uuid', fastDayId: day.id, kcal: 120 };
    saveQuickEntry(ctx, input);
    advance();
    saveQuickEntry(ctx, input);

    const view = getDayView(ctx, day.date);
    expect(view.entries).toHaveLength(1);
    expect(view.summary?.consumedKcal).toBe(120);
    expect(view.entries[0]?.createdAt).toBe('2026-10-25T08:00:00.000Z');
  });

  it('KIR-07: a repeated save with the same UUID keeps the latest values', () => {
    saveQuickEntry(ctx, { id: 'form-uuid', fastDayId: day.id, kcal: 120 });
    saveQuickEntry(ctx, { id: 'form-uuid', fastDayId: day.id, kcal: 150, name: 'Keitto' });
    expect(getDayView(ctx, day.date).entries).toEqual([
      expect.objectContaining({ id: 'form-uuid', kcal: 150, amount: 150, name: 'Keitto' }),
    ]);
  });

  it('KIR-07: the same food can be logged again on purpose with a new form', () => {
    saveQuickEntry(ctx, { id: 'form-1', fastDayId: day.id, kcal: 120, name: 'Jogurtti' });
    saveQuickEntry(ctx, { id: 'form-2', fastDayId: day.id, kcal: 120, name: 'Jogurtti' });
    expect(getDayView(ctx, day.date).summary?.consumedKcal).toBe(240);
  });

  it('KIR-05: name and energy can be corrected', () => {
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120, name: 'Jogurti' });
    advance();
    const updated = updateQuickEntry(ctx, 'e1', { name: 'Jogurtti', kcal: 95 });
    expect(updated).toMatchObject({
      name: 'Jogurtti',
      amount: 95,
      kcal: 95,
      createdAt: '2026-10-25T08:00:00.000Z',
      updatedAt: '2026-10-25T08:00:01.000Z',
    });
    expect(() => updateQuickEntry(ctx, 'e1', { kcal: -5 })).toThrow(ServiceError);
    expect(() => updateQuickEntry(ctx, 'missing', { kcal: 5 })).toThrow(
      expect.objectContaining({ code: 'not_found' }),
    );
  });

  it('KIR-05: an entry can be deleted', () => {
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120 });
    expect(deleteEntry(ctx, 'e1')?.id).toBe('e1');
    expect(getEntry(ctx, 'e1')).toBeNull();
    expect(deleteEntry(ctx, 'e1')).toBeNull();
  });

  it('KIR-05: an entry can be moved to another fast day with its values unchanged', () => {
    const other = startFastDay(ctx, '2026-10-22');
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120, name: 'Jogurtti' });

    const moved = moveEntry(ctx, 'e1', other.id);
    expect(moved).toMatchObject({ fastDayId: other.id, kcal: 120, name: 'Jogurtti' });
    expect(getDayView(ctx, day.date).summary?.consumedKcal).toBe(0);
    expect(getDayView(ctx, other.date).summary?.consumedKcal).toBe(120);
  });

  it('KIR-05: an entry cannot be moved to a day that is not a fast day', () => {
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120 });
    expect(() => moveEntry(ctx, 'e1', 'missing')).toThrow(
      expect.objectContaining({ code: 'not_found' }),
    );
    expect(getEntry(ctx, 'e1')?.fastDayId).toBe(day.id);
  });

  it('LAA-07: logging needs no meal category', () => {
    const entry = saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120 });
    expect(Object.keys(entry)).not.toContain('mealType');
    expect(Object.keys(entry)).not.toContain('category');
  });
});

describe('Acceptance criterion 3: correction and overage (KIR-05, PAI-03, LAS-03)', () => {
  let ctx: ServiceContext;
  let day: FastDay;

  beforeEach(() => {
    ({ ctx } = createTestContext());
    setDefaultLimit(ctx, 600);
    day = startFastDay(ctx, '2026-10-25');
    saveQuickEntry(ctx, { id: 'a', fastDayId: day.id, kcal: 200 });
    saveQuickEntry(ctx, { id: 'b', fastDayId: day.id, kcal: 150 });
  });

  it('criterion 3: changing an amount updates the day total', () => {
    expect(getDayView(ctx, day.date).summary?.consumedKcal).toBe(350);
    updateQuickEntry(ctx, 'b', { kcal: 180.4 });
    const summary = getDayView(ctx, day.date).summary;
    expect(summary?.consumedKcal).toBeCloseTo(380.4, 10);
    expect(summary?.remainingKcal).toBeCloseTo(219.6, 10);
  });

  it('criterion 3: deleting an entry updates the day total', () => {
    deleteEntry(ctx, 'a');
    expect(getDayView(ctx, day.date).summary).toMatchObject({
      consumedKcal: 150,
      remainingKcal: 450,
      status: 'remaining',
    });
  });

  it('criterion 3: the limit can be exceeded without blocking logging', () => {
    const entry = saveQuickEntry(ctx, { id: 'c', fastDayId: day.id, kcal: 295 });
    expect(entry.kcal).toBe(295);

    const summary = getDayView(ctx, day.date).summary;
    expect(summary).toMatchObject({
      consumedKcal: 645,
      status: 'over',
      overKcal: 45,
      remainingKcal: 0,
    });

    // Logging still works after the limit is exceeded.
    saveQuickEntry(ctx, { id: 'd', fastDayId: day.id, kcal: 10 });
    expect(getDayView(ctx, day.date).summary?.overKcal).toBe(55);
  });

  it('criterion 3: correcting an entry can bring the day back under the limit', () => {
    saveQuickEntry(ctx, { id: 'c', fastDayId: day.id, kcal: 295 });
    updateQuickEntry(ctx, 'c', { kcal: 200 });
    expect(getDayView(ctx, day.date).summary).toMatchObject({
      consumedKcal: 550,
      status: 'remaining',
      remainingKcal: 50,
      overKcal: 0,
    });
  });
});

describe('KIR-06: persistence', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kevytpaasto-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('KIR-06: entries survive closing and reopening the database', () => {
    const file = join(dir, 'test.db');
    const first = createTestContext(file);
    setDefaultLimit(first.ctx, 600);
    const day = startFastDay(first.ctx, '2026-10-25');
    saveQuickEntry(first.ctx, { id: 'e1', fastDayId: day.id, kcal: 120.5, name: 'Keitto' });
    first.sqlite.close();

    const second = createTestContext(file);
    const view = getDayView(second.ctx, '2026-10-25');
    expect(view.day?.limitKcal).toBe(600);
    expect(view.entries).toEqual([
      expect.objectContaining({ id: 'e1', kcal: 120.5, name: 'Keitto' }),
    ]);
    second.sqlite.close();
  });
});
