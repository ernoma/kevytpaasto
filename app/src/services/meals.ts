import { asc, eq, isNull, sql } from 'drizzle-orm';

import { meal, mealItem } from '@/db/schema';
import { normalizeText } from '@/domain/food';
import { computeKcal, mealKcal, type PortionUnit } from '@/domain/portion';

import type { ServiceContext } from './context';
import { timestamp } from './context';
import { ServiceError } from './errors';
import { foodEnergy, getFood, requireActiveFood, type Food } from './foods';

export type Meal = typeof meal.$inferSelect;
export type MealItem = typeof mealItem.$inferSelect;

export interface MealItemInput {
  foodId: string;
  amount: number;
  unit: PortionUnit;
}

export interface MealInput {
  name: string;
  /** New meals are favourites unless stated otherwise: they are made to be logged again. */
  isFavorite?: boolean;
  items: readonly MealItemInput[];
}

export interface MealDetails {
  meal: Meal;
  items: (MealItem & { food: Food })[];
  /** Energy of the whole meal computed from its items (OMA-04); null if it cannot be computed. */
  kcal: number | null;
}

function requireValidMeal(
  ctx: ServiceContext,
  input: MealInput,
  existingFoodIds: ReadonlySet<string>,
): void {
  if (normalizeText(input.name) === null) {
    throw new ServiceError('invalid_input', 'Meal name is required');
  }
  if (input.items.length === 0) {
    throw new ServiceError('invalid_input', 'A meal needs at least one item');
  }
  for (const item of input.items) {
    if (!(Number.isFinite(item.amount) && item.amount > 0)) {
      throw new ServiceError('invalid_amount', `Invalid amount: ${item.amount}`);
    }
    // A food deleted after it was added may stay in the meal, but cannot be added anew.
    const row = existingFoodIds.has(item.foodId)
      ? getFood(ctx, item.foodId)
      : requireActiveFood(ctx, item.foodId);
    if (!row) {
      throw new ServiceError('not_found', `Food ${item.foodId} not found`);
    }
    const result = computeKcal({ ...foodEnergy(row), amount: item.amount, unit: item.unit });
    if (!result.ok) {
      throw new ServiceError(result.error, `Cannot compute energy of food ${item.foodId}`);
    }
  }
}

function insertItems(ctx: ServiceContext, mealId: string, items: readonly MealItemInput[]): void {
  for (const item of items) {
    ctx.db
      .insert(mealItem)
      .values({
        id: ctx.newId(),
        mealId,
        foodId: item.foodId,
        amount: item.amount,
        unit: item.unit,
      })
      .run();
  }
}

/** Returns a meal, including a soft-deleted one. */
export function getMealRow(ctx: ServiceContext, id: string): Meal | null {
  return ctx.db.select().from(meal).where(eq(meal.id, id)).get() ?? null;
}

/** A meal with its items and computed energy (OMA-04). */
export function getMeal(ctx: ServiceContext, id: string): MealDetails | null {
  const row = getMealRow(ctx, id);
  if (!row) {
    return null;
  }
  const items = ctx.db
    .select()
    .from(mealItem)
    .where(eq(mealItem.mealId, id))
    .orderBy(sql`rowid`)
    .all()
    .map((item) => ({ ...item, food: getFood(ctx, item.foodId)! }));
  const result = mealKcal(
    items.map((item) => ({ ...foodEnergy(item.food), amount: item.amount, unit: item.unit })),
  );
  return { meal: row, items, kcal: result.ok ? result.kcal : null };
}

/** Returns a meal that can be logged: it exists and is not deleted. */
export function requireActiveMeal(ctx: ServiceContext, id: string): MealDetails {
  const details = getMeal(ctx, id);
  if (!details) {
    throw new ServiceError('not_found', `Meal ${id} not found`);
  }
  if (details.meal.deletedAt !== null) {
    throw new ServiceError('deleted', `Meal ${id} has been deleted`);
  }
  return details;
}

/**
 * Saves a named favourite meal made of the user's foods (OMA-04). Its energy is always
 * computed from the items and never stored. Meals are private (OMA-07).
 */
export function createMeal(ctx: ServiceContext, input: MealInput & { id?: string }): MealDetails {
  return ctx.db.transaction((tx) => {
    const txCtx = { ...ctx, db: tx };
    requireValidMeal(txCtx, input, new Set());
    const id = input.id ?? ctx.newId();
    const now = timestamp(ctx);
    tx.insert(meal)
      .values({
        id,
        name: normalizeText(input.name)!,
        isFavorite: input.isFavorite ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    insertItems(txCtx, id, input.items);
    return getMeal(txCtx, id)!;
  });
}

/**
 * Replaces a meal's name and items (OMA-06). Earlier log entries are snapshots and keep their
 * energy (KIR-08, criterion 10).
 */
export function updateMeal(ctx: ServiceContext, id: string, input: MealInput): MealDetails {
  return ctx.db.transaction((tx) => {
    const txCtx = { ...ctx, db: tx };
    const existing = requireActiveMeal(txCtx, id);
    requireValidMeal(txCtx, input, new Set(existing.items.map((item) => item.foodId)));
    tx.update(meal)
      .set({
        name: normalizeText(input.name)!,
        ...(input.isFavorite === undefined ? {} : { isFavorite: input.isFavorite }),
        updatedAt: timestamp(ctx),
      })
      .where(eq(meal.id, id))
      .run();
    tx.delete(mealItem).where(eq(mealItem.mealId, id)).run();
    insertItems(txCtx, id, input.items);
    return getMeal(txCtx, id)!;
  });
}

/** Meals that have not been deleted, by name, with their computed energy. */
export function listMeals(ctx: ServiceContext): MealDetails[] {
  return ctx.db
    .select({ id: meal.id })
    .from(meal)
    .where(isNull(meal.deletedAt))
    .orderBy(asc(sql`${meal.name} COLLATE NOCASE`), asc(meal.id))
    .all()
    .map((row) => getMeal(ctx, row.id)!);
}

/** Marks a meal as a favourite or removes the marking (OMA-03, OMA-04). */
export function setMealFavorite(ctx: ServiceContext, id: string, isFavorite: boolean): Meal {
  requireActiveMeal(ctx, id);
  return ctx.db
    .update(meal)
    .set({ isFavorite, updatedAt: timestamp(ctx) })
    .where(eq(meal.id, id))
    .returning()
    .get()!;
}

/** Soft-deletes a meal (OMA-06). Old log entries are not affected. Deleting twice is a no-op. */
export function deleteMeal(ctx: ServiceContext, id: string): Meal {
  const existing = getMealRow(ctx, id);
  if (!existing) {
    throw new ServiceError('not_found', `Meal ${id} not found`);
  }
  if (existing.deletedAt !== null) {
    return existing;
  }
  const now = timestamp(ctx);
  return ctx.db
    .update(meal)
    .set({ deletedAt: now, isFavorite: false, updatedAt: now })
    .where(eq(meal.id, id))
    .returning()
    .get()!;
}
