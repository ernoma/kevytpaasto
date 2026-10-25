import { asc, count, desc, eq } from 'drizzle-orm';

import { fastDay, logEntry } from '@/db/schema';
import { daySummary, type DaySummary } from '@/domain/daySummary';
import { isValidLimit } from '@/domain/limit';
import { isLocalDate } from '@/domain/localDate';

import type { ServiceContext } from './context';
import { timestamp } from './context';
import { ServiceError } from './errors';
import type { LogEntry } from './logEntries';
import { getSettings } from './settings';

export type FastDay = typeof fastDay.$inferSelect;

export interface DayView {
  /** Null on a non-fast day: nothing is expected to be logged (PAI-04). */
  day: FastDay | null;
  entries: LogEntry[];
  summary: DaySummary | null;
}

export type DeleteFastDayResult =
  | { deleted: true; deletedEntryCount: number }
  | { deleted: false; reason: 'has_entries'; entryCount: number };

function requireLocalDate(date: string): void {
  if (!isLocalDate(date)) {
    throw new ServiceError('invalid_input', `Expected a YYYY-MM-DD date, got ${date}`);
  }
}

export function getFastDay(ctx: ServiceContext, date: string): FastDay | null {
  requireLocalDate(date);
  return ctx.db.select().from(fastDay).where(eq(fastDay.date, date)).get() ?? null;
}

export function getFastDayById(ctx: ServiceContext, id: string): FastDay | null {
  return ctx.db.select().from(fastDay).where(eq(fastDay.id, id)).get() ?? null;
}

/** Fast days, newest first. */
export function listFastDays(ctx: ServiceContext): FastDay[] {
  return ctx.db.select().from(fastDay).orderBy(desc(fastDay.date)).all();
}

/**
 * Marks a local calendar date as a fast day (PAI-01, PAI-05). The current default limit is
 * copied to the day as a snapshot (KAY-03). Starting an existing day returns it unchanged.
 */
export function startFastDay(ctx: ServiceContext, date: string): FastDay {
  const existing = getFastDay(ctx, date);
  if (existing) {
    return existing;
  }
  const { defaultLimitKcal } = getSettings(ctx);
  if (defaultLimitKcal === null) {
    throw new ServiceError('no_default_limit', 'Set a default limit before starting a fast day');
  }
  ctx.db
    .insert(fastDay)
    .values({ id: ctx.newId(), date, limitKcal: defaultLimitKcal, createdAt: timestamp(ctx) })
    .onConflictDoNothing({ target: fastDay.date })
    .run();
  return getFastDay(ctx, date)!;
}

/** Changes the limit of one existing fast day only (KAY-03). */
export function setFastDayLimit(ctx: ServiceContext, id: string, limitKcal: number): FastDay {
  if (!isValidLimit(limitKcal)) {
    throw new ServiceError('invalid_limit', `Invalid limit: ${limitKcal}`);
  }
  const updated = ctx.db
    .update(fastDay)
    .set({ limitKcal })
    .where(eq(fastDay.id, id))
    .returning()
    .get();
  if (!updated) {
    throw new ServiceError('not_found', `Fast day ${id} not found`);
  }
  return updated;
}

export function listEntries(ctx: ServiceContext, fastDayId: string): LogEntry[] {
  return ctx.db
    .select()
    .from(logEntry)
    .where(eq(logEntry.fastDayId, fastDayId))
    .orderBy(asc(logEntry.createdAt), asc(logEntry.id))
    .all();
}

/** Everything the day view shows: the day, its entries and the summary (PAI-02, PAI-03). */
export function getDayView(ctx: ServiceContext, date: string): DayView {
  const day = getFastDay(ctx, date);
  if (!day) {
    return { day: null, entries: [], summary: null };
  }
  const entries = listEntries(ctx, day.id);
  return { day, entries, summary: daySummary(entries, day.limitKcal) };
}

export function countEntries(ctx: ServiceContext, fastDayId: string): number {
  const row = ctx.db
    .select({ value: count() })
    .from(logEntry)
    .where(eq(logEntry.fastDayId, fastDayId))
    .get();
  return row?.value ?? 0;
}

/**
 * Removes a fast day marking (PAI-06). If the day has entries, nothing is deleted unless the
 * caller passes `deleteEntries: true` after the user has separately confirmed it.
 */
export function deleteFastDay(
  ctx: ServiceContext,
  id: string,
  options: { deleteEntries?: boolean } = {},
): DeleteFastDayResult {
  return ctx.db.transaction((tx) => {
    const day = tx.select().from(fastDay).where(eq(fastDay.id, id)).get();
    if (!day) {
      throw new ServiceError('not_found', `Fast day ${id} not found`);
    }
    const entryCount = countEntries({ ...ctx, db: tx }, id);
    if (entryCount > 0 && !options.deleteEntries) {
      return { deleted: false, reason: 'has_entries', entryCount };
    }
    tx.delete(logEntry).where(eq(logEntry.fastDayId, id)).run();
    tx.delete(fastDay).where(eq(fastDay.id, id)).run();
    return { deleted: true, deletedEntryCount: entryCount };
  });
}
