import { eq } from 'drizzle-orm';

import { fastDay, logEntry } from '@/db/schema';
import { isNonNegativeNumber } from '@/domain/amount';
import {
  computeKcal,
  type EnergyData,
  type PortionInput,
  type PortionUnit,
} from '@/domain/portion';

import type { ServiceContext } from './context';
import { timestamp } from './context';
import { ServiceError } from './errors';
import { foodEnergy, requireActiveFood } from './foods';
import { requireActiveMeal } from './meals';

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

export interface FoodEntryInput {
  /** UUID created when the form opened (KIR-07). */
  id: string;
  fastDayId: string;
  foodId: string;
  amount: number;
  unit: PortionUnit;
}

export interface MealEntryInput {
  /** UUID created when the form opened (KIR-07). */
  id: string;
  fastDayId: string;
  mealId: string;
  /** Share of the whole meal, e.g. 0.5 for half (OMA-05). */
  fraction: number;
}

function requireEntryId(id: string): void {
  if (id.trim() === '') {
    throw new ServiceError('invalid_input', 'Entry id is required');
  }
}

function requireOrigin(entry: LogEntry, originType: LogEntry['originType']): void {
  if (entry.originType !== originType) {
    throw new ServiceError(
      'origin_mismatch',
      `Entry ${entry.id} was logged from ${entry.originType}, not ${originType}`,
    );
  }
}

function requireFraction(fraction: number): void {
  if (!(Number.isFinite(fraction) && fraction > 0)) {
    throw new ServiceError('invalid_amount', `Invalid meal fraction: ${fraction}`);
  }
}

/** Computes energy for an amount, throwing the domain error as a service error. */
function kcalOrThrow(input: PortionInput): number {
  const result = computeKcal(input);
  if (!result.ok) {
    throw new ServiceError(result.error, `Cannot compute energy: ${result.error}`);
  }
  return result.kcal;
}

/** The energy data stored in an entry as it was when logged (KIR-08). */
function entryEnergy(entry: LogEntry): EnergyData {
  return {
    energyKcal: entry.energyKcalPerBasis,
    basis: entry.energyBasis,
    serving: { amount: entry.servingAmount, unit: entry.servingUnit, label: entry.servingLabel },
  };
}

/**
 * Logs an amount of a food (KIR-03, KIR-04). Name, energy, basis and serving are copied to the
 * entry as a snapshot, so later changes to the food do not affect it (KIR-08). Saving is
 * idempotent by the form's UUID (KIR-07).
 */
export function saveFoodEntry(ctx: ServiceContext, input: FoodEntryInput): LogEntry {
  requireEntryId(input.id);
  return ctx.db.transaction((tx) => {
    const txCtx = { ...ctx, db: tx };
    const existing = getEntry(txCtx, input.id);
    if (existing) {
      requireOrigin(existing, 'food');
      return updateFoodEntry(txCtx, input.id, { amount: input.amount, unit: input.unit });
    }
    requireFastDay(txCtx, input.fastDayId);
    const source = requireActiveFood(txCtx, input.foodId);
    const energy = foodEnergy(source);
    const kcal = kcalOrThrow({ ...energy, amount: input.amount, unit: input.unit });
    const now = timestamp(ctx);
    return tx
      .insert(logEntry)
      .values({
        id: input.id,
        fastDayId: input.fastDayId,
        createdAt: now,
        updatedAt: now,
        name: source.name,
        amount: input.amount,
        unit: input.unit,
        energyKcalPerBasis: source.energyKcal,
        energyBasis: source.energyBasis,
        servingAmount: source.servingAmount,
        servingUnit: source.servingUnit,
        servingLabel: source.servingLabel,
        kcal,
        originType: 'food',
        originId: source.id,
      })
      .returning()
      .get();
  });
}

/**
 * Changes the amount of a food entry (KIR-05). The energy is recomputed from the entry's own
 * snapshot, never from the current food (KIR-08).
 */
export function updateFoodEntry(
  ctx: ServiceContext,
  id: string,
  changes: { amount: number; unit: PortionUnit },
): LogEntry {
  const existing = getEntry(ctx, id);
  if (!existing) {
    throw new ServiceError('not_found', `Entry ${id} not found`);
  }
  requireOrigin(existing, 'food');
  const kcal = kcalOrThrow({ ...entryEnergy(existing), ...changes });
  return ctx.db
    .update(logEntry)
    .set({ amount: changes.amount, unit: changes.unit, kcal, updatedAt: timestamp(ctx) })
    .where(eq(logEntry.id, id))
    .returning()
    .get()!;
}

/**
 * Logs a favourite meal or a share of it (OMA-04, OMA-05) as one entry. The energy of the
 * whole meal is computed from its items now and stored as the entry's energy per serving, so
 * later changes to the meal or its foods do not affect the entry (KIR-08).
 */
export function saveMealEntry(ctx: ServiceContext, input: MealEntryInput): LogEntry {
  requireEntryId(input.id);
  requireFraction(input.fraction);
  return ctx.db.transaction((tx) => {
    const txCtx = { ...ctx, db: tx };
    const existing = getEntry(txCtx, input.id);
    if (existing) {
      requireOrigin(existing, 'meal');
      return updateMealEntry(txCtx, input.id, { fraction: input.fraction });
    }
    requireFastDay(txCtx, input.fastDayId);
    const details = requireActiveMeal(txCtx, input.mealId);
    if (details.kcal === null) {
      throw new ServiceError('missing_energy', `Energy of meal ${input.mealId} is unknown`);
    }
    const now = timestamp(ctx);
    return tx
      .insert(logEntry)
      .values({
        id: input.id,
        fastDayId: input.fastDayId,
        createdAt: now,
        updatedAt: now,
        name: details.meal.name,
        amount: input.fraction,
        unit: 'serving',
        energyKcalPerBasis: details.kcal,
        energyBasis: 'per_serving',
        kcal: details.kcal * input.fraction,
        originType: 'meal',
        originId: details.meal.id,
        mealFraction: input.fraction,
      })
      .returning()
      .get();
  });
}

/** Changes the share of a meal entry (KIR-05, OMA-05) using the entry's own snapshot (KIR-08). */
export function updateMealEntry(
  ctx: ServiceContext,
  id: string,
  changes: { fraction: number },
): LogEntry {
  requireFraction(changes.fraction);
  const existing = getEntry(ctx, id);
  if (!existing) {
    throw new ServiceError('not_found', `Entry ${id} not found`);
  }
  requireOrigin(existing, 'meal');
  const kcal = kcalOrThrow({ ...entryEnergy(existing), amount: changes.fraction, unit: 'serving' });
  return ctx.db
    .update(logEntry)
    .set({
      amount: changes.fraction,
      mealFraction: changes.fraction,
      kcal,
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
