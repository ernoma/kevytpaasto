import { eq } from 'drizzle-orm';

import { fastDay, logEntry } from '@/db/schema';
import { isNonNegativeNumber } from '@/domain/amount';

import type { ServiceContext } from './context';
import { timestamp } from './context';
import { ServiceError } from './errors';

export type LogEntry = typeof logEntry.$inferSelect;

export interface QuickEntryInput {
  /** UUID created when the form opened (KIR-07). */
  id: string;
  fastDayId: string;
  kcal: number;
  /** Optional (KIR-02). Blank is stored as null. */
  name?: string | null;
}

function normalizeName(name: string | null | undefined): string | null {
  const trimmed = name?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

function requireKcal(kcal: number): void {
  if (!isNonNegativeNumber(kcal)) {
    throw new ServiceError('invalid_amount', `Invalid energy: ${kcal}`);
  }
}

function requireFastDay(ctx: ServiceContext, fastDayId: string): void {
  const day = ctx.db
    .select({ id: fastDay.id })
    .from(fastDay)
    .where(eq(fastDay.id, fastDayId))
    .get();
  if (!day) {
    throw new ServiceError('not_found', `Fast day ${fastDayId} not found`);
  }
}

export function getEntry(ctx: ServiceContext, id: string): LogEntry | null {
  return ctx.db.select().from(logEntry).where(eq(logEntry.id, id)).get() ?? null;
}

/**
 * Saves a quick entry where only the energy is required (KIR-02). Saving is idempotent by the
 * form's UUID (KIR-07): repeating the save updates the same row instead of adding another.
 * A new form gets a new UUID, so logging the same thing again is still possible.
 */
export function saveQuickEntry(ctx: ServiceContext, input: QuickEntryInput): LogEntry {
  if (input.id.trim() === '') {
    throw new ServiceError('invalid_input', 'Entry id is required');
  }
  requireKcal(input.kcal);
  return ctx.db.transaction((tx) => {
    const txCtx = { ...ctx, db: tx };
    const existing = getEntry(txCtx, input.id);
    if (existing) {
      if (existing.originType !== 'quick') {
        throw new ServiceError('not_quick_entry', `Entry ${input.id} is not a quick entry`);
      }
      return updateQuickEntry(txCtx, input.id, { name: input.name, kcal: input.kcal });
    }
    requireFastDay(txCtx, input.fastDayId);
    const now = timestamp(ctx);
    return tx
      .insert(logEntry)
      .values({
        id: input.id,
        fastDayId: input.fastDayId,
        createdAt: now,
        updatedAt: now,
        name: normalizeName(input.name),
        // A quick entry's amount is the energy itself (KIR-08 snapshot).
        amount: input.kcal,
        unit: 'kcal',
        kcal: input.kcal,
        originType: 'quick',
      })
      .returning()
      .get();
  });
}

/** Corrects the name and energy of a quick entry (KIR-05). */
export function updateQuickEntry(
  ctx: ServiceContext,
  id: string,
  changes: { name?: string | null; kcal: number },
): LogEntry {
  requireKcal(changes.kcal);
  const existing = getEntry(ctx, id);
  if (!existing) {
    throw new ServiceError('not_found', `Entry ${id} not found`);
  }
  if (existing.originType !== 'quick') {
    throw new ServiceError('not_quick_entry', `Entry ${id} is not a quick entry`);
  }
  return ctx.db
    .update(logEntry)
    .set({
      name: normalizeName(changes.name),
      amount: changes.kcal,
      kcal: changes.kcal,
      updatedAt: timestamp(ctx),
    })
    .where(eq(logEntry.id, id))
    .returning()
    .get()!;
}

/** Deletes an entry (KIR-05). Returns the deleted row, or null if it did not exist. */
export function deleteEntry(ctx: ServiceContext, id: string): LogEntry | null {
  return ctx.db.delete(logEntry).where(eq(logEntry.id, id)).returning().get() ?? null;
}

/** Moves an entry to another existing fast day (KIR-05). The snapshot values stay as they are. */
export function moveEntry(ctx: ServiceContext, id: string, targetFastDayId: string): LogEntry {
  return ctx.db.transaction((tx) => {
    const txCtx = { ...ctx, db: tx };
    const existing = getEntry(txCtx, id);
    if (!existing) {
      throw new ServiceError('not_found', `Entry ${id} not found`);
    }
    if (existing.fastDayId === targetFastDayId) {
      return existing;
    }
    requireFastDay(txCtx, targetFastDayId);
    return tx
      .update(logEntry)
      .set({ fastDayId: targetFastDayId, updatedAt: timestamp(ctx) })
      .where(eq(logEntry.id, id))
      .returning()
      .get()!;
  });
}
