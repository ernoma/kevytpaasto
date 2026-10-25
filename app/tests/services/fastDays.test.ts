import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ServiceContext } from '@/services/context';
import { ServiceError } from '@/services/errors';
import {
  deleteFastDay,
  getDayView,
  getFastDay,
  listFastDays,
  setFastDayLimit,
  startFastDay,
} from '@/services/fastDays';
import { getEntry, saveQuickEntry } from '@/services/logEntries';
import { setDefaultLimit } from '@/services/settings';

import { createTestContext } from '../helpers/db';

describe('fast day service (PAI-01…PAI-06)', () => {
  let ctx: ServiceContext;
  let advance: (ms?: number) => void;

  beforeEach(() => {
    ({ ctx, advance } = createTestContext());
    setDefaultLimit(ctx, 600);
  });

  it('PAI-01: any calendar date can be marked as a fast day, any number per week', () => {
    for (const date of ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-25']) {
      startFastDay(ctx, date);
    }
    expect(listFastDays(ctx).map((day) => day.date)).toEqual([
      '2026-10-25',
      '2026-10-21',
      '2026-10-20',
      '2026-10-19',
    ]);
  });

  it('PAI-01: starting the same day twice returns the existing day', () => {
    const first = startFastDay(ctx, '2026-10-25');
    setDefaultLimit(ctx, 500);
    const second = startFastDay(ctx, '2026-10-25');
    expect(second).toEqual(first);
    expect(listFastDays(ctx)).toHaveLength(1);
  });

  it('PAI-05: rejects anything other than a local YYYY-MM-DD date', () => {
    expect(() => startFastDay(ctx, '2026-10-25T00:00:00Z')).toThrow(ServiceError);
    expect(() => startFastDay(ctx, '2026-02-30')).toThrow(ServiceError);
  });

  it('KAY-01: a fast day cannot be started before a limit is set', () => {
    const { ctx: fresh } = createTestContext();
    expect(() => startFastDay(fresh, '2026-10-25')).toThrow(
      expect.objectContaining({ code: 'no_default_limit' }),
    );
  });

  it('PAI-04: a non-fast day has no day, entries or summary', () => {
    expect(getDayView(ctx, '2026-10-24')).toEqual({ day: null, entries: [], summary: null });
  });

  it('PAI-02: the day view has the date, limit, consumed, remaining and entries in order', () => {
    const day = startFastDay(ctx, '2026-10-25');
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120, name: 'Jogurtti' });
    advance();
    saveQuickEntry(ctx, { id: 'e0', fastDayId: day.id, kcal: 80 });

    const view = getDayView(ctx, '2026-10-25');
    expect(view.day?.date).toBe('2026-10-25');
    expect(view.summary).toMatchObject({
      limitKcal: 600,
      consumedKcal: 200,
      remainingKcal: 400,
      status: 'remaining',
    });
    // Ordered by creation time, not by id.
    expect(view.entries.map((entry) => entry.id)).toEqual(['e1', 'e0']);
  });

  it('PAI-06: a day without entries is deleted directly', () => {
    const day = startFastDay(ctx, '2026-10-25');
    expect(deleteFastDay(ctx, day.id)).toEqual({ deleted: true, deletedEntryCount: 0 });
    expect(getFastDay(ctx, '2026-10-25')).toBeNull();
  });

  it('PAI-06: a day with entries is not deleted without separate confirmation', () => {
    const day = startFastDay(ctx, '2026-10-25');
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120 });
    saveQuickEntry(ctx, { id: 'e2', fastDayId: day.id, kcal: 80 });

    expect(deleteFastDay(ctx, day.id)).toEqual({
      deleted: false,
      reason: 'has_entries',
      entryCount: 2,
    });
    expect(getFastDay(ctx, '2026-10-25')).not.toBeNull();
    expect(getEntry(ctx, 'e1')).not.toBeNull();
  });

  it('PAI-06: a confirmed delete removes the day and its entries only', () => {
    const day = startFastDay(ctx, '2026-10-25');
    const other = startFastDay(ctx, '2026-10-22');
    saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120 });
    saveQuickEntry(ctx, { id: 'keep', fastDayId: other.id, kcal: 50 });

    expect(deleteFastDay(ctx, day.id, { deleteEntries: true })).toEqual({
      deleted: true,
      deletedEntryCount: 1,
    });
    expect(getFastDay(ctx, '2026-10-25')).toBeNull();
    expect(getEntry(ctx, 'e1')).toBeNull();
    expect(getEntry(ctx, 'keep')).not.toBeNull();
  });

  it('deleting or changing an unknown day is an error', () => {
    expect(() => deleteFastDay(ctx, 'missing')).toThrow(
      expect.objectContaining({ code: 'not_found' }),
    );
    expect(() => setFastDayLimit(ctx, 'missing', 600)).toThrow(
      expect.objectContaining({ code: 'not_found' }),
    );
  });

  describe('PAI-05: time zone changes', () => {
    let originalTz: string | undefined;

    beforeEach(() => {
      originalTz = process.env.TZ;
    });

    afterEach(() => {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    });

    it('PAI-05: entries stay on their day when the time zone changes', () => {
      process.env.TZ = 'Europe/Helsinki';
      const day = startFastDay(ctx, '2026-10-25');
      saveQuickEntry(ctx, { id: 'e1', fastDayId: day.id, kcal: 120 });

      process.env.TZ = 'America/Los_Angeles';
      expect(getDayView(ctx, '2026-10-25').entries.map((entry) => entry.id)).toEqual(['e1']);
      expect(getDayView(ctx, '2026-10-24').day).toBeNull();
    });
  });
});
