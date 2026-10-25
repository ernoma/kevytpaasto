import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { food } from '@/db/schema';
import { normalizeText, validateFood, type FoodInput } from '@/domain/food';
import type { EnergyData } from '@/domain/portion';

import type { ServiceContext } from './context';
import { timestamp } from './context';
import { ServiceError } from './errors';

export type Food = typeof food.$inferSelect;

/** Energy data of a food row in the shape the domain calculations use. */
export function foodEnergy(row: Food): EnergyData {
  return {
    energyKcal: row.energyKcal,
    basis: row.energyBasis,
    serving: { amount: row.servingAmount, unit: row.servingUnit, label: row.servingLabel },
  };
}

function requireValidFood(input: FoodInput): void {
  const errors = validateFood(input);
  if (errors.length > 0) {
    const fields = errors.map((e) => `${e.field}: ${e.error}`).join(', ');
    throw new ServiceError('invalid_input', `Invalid food (${fields})`);
  }
}

function foodValues(input: FoodInput) {
  return {
    name: normalizeText(input.name)!,
    brand: normalizeText(input.brand),
    energyKcal: input.energyKcal,
    energyBasis: input.basis,
    servingAmount: input.servingAmount ?? null,
    servingUnit: input.servingUnit ?? null,
    servingLabel: normalizeText(input.servingLabel),
  };
}

/** Returns a food, including a soft-deleted one, so that old references stay readable. */
export function getFood(ctx: ServiceContext, id: string): Food | null {
  return ctx.db.select().from(food).where(eq(food.id, id)).get() ?? null;
}

/** Returns a food that can be logged or added to a meal: it exists and is not deleted. */
export function requireActiveFood(ctx: ServiceContext, id: string): Food {
  const row = getFood(ctx, id);
  if (!row) {
    throw new ServiceError('not_found', `Food ${id} not found`);
  }
  if (row.deletedAt !== null) {
    throw new ServiceError('deleted', `Food ${id} has been deleted`);
  }
  return row;
}

/**
 * Saves the user's own food (OMA-01, OMA-02). Own foods are private: nothing is queued for
 * publishing to Open Food Facts (OMA-07).
 */
export function createFood(ctx: ServiceContext, input: FoodInput & { id?: string }): Food {
  requireValidFood(input);
  const now = timestamp(ctx);
  return ctx.db
    .insert(food)
    .values({
      id: input.id ?? ctx.newId(),
      source: 'user',
      ...foodValues(input),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

/**
 * Edits the user's own food (OMA-06). Log entries are snapshots, so they do not change
 * (KIR-08); favourite meals using the food are computed from the new values from now on.
 */
export function updateFood(ctx: ServiceContext, id: string, input: FoodInput): Food {
  requireValidFood(input);
  const existing = requireActiveFood(ctx, id);
  if (existing.source !== 'user') {
    throw new ServiceError('invalid_input', `Food ${id} is not the user's own food`);
  }
  return ctx.db
    .update(food)
    .set({ ...foodValues(input), updatedAt: timestamp(ctx) })
    .where(eq(food.id, id))
    .returning()
    .get()!;
}

/** The user's own foods that have not been deleted, by name (OMA-06). */
export function listFoods(ctx: ServiceContext): Food[] {
  return ctx.db
    .select()
    .from(food)
    .where(and(eq(food.source, 'user'), isNull(food.deletedAt)))
    .orderBy(asc(sql`${food.name} COLLATE NOCASE`), asc(food.id))
    .all();
}

/** Marks a food as a favourite or removes the marking (OMA-03). */
export function setFoodFavorite(ctx: ServiceContext, id: string, isFavorite: boolean): Food {
  requireActiveFood(ctx, id);
  return ctx.db
    .update(food)
    .set({ isFavorite, updatedAt: timestamp(ctx) })
    .where(eq(food.id, id))
    .returning()
    .get()!;
}

/**
 * Soft-deletes a food (OMA-06): it disappears from lists and favourites but rows that refer to
 * it stay valid. Old log entries are snapshots and are not affected. Deleting twice is a no-op.
 */
export function deleteFood(ctx: ServiceContext, id: string): Food {
  const existing = getFood(ctx, id);
  if (!existing) {
    throw new ServiceError('not_found', `Food ${id} not found`);
  }
  if (existing.deletedAt !== null) {
    return existing;
  }
  const now = timestamp(ctx);
  return ctx.db
    .update(food)
    .set({ deletedAt: now, isFavorite: false, updatedAt: now })
    .where(eq(food.id, id))
    .returning()
    .get()!;
}
