import { and, eq, isNull } from 'drizzle-orm';

import { food, meal } from '@/db/schema';
import { computeKcal, hasDefaultServing } from '@/domain/portion';

import type { ServiceContext } from './context';
import { foodEnergy, type Food } from './foods';
import { getMeal, type MealDetails } from './meals';

export type Favorite =
  | {
      type: 'food';
      id: string;
      name: string;
      food: Food;
      /**
       * One serving is the default portion (OMA-02, OMA-03). Null when the food has no serving,
       * in which case the amount must be entered before logging.
       */
      defaultPortion: { amount: 1; unit: 'serving' } | null;
      /** Energy of the default portion, or null if there is none or it cannot be computed. */
      kcal: number | null;
    }
  | {
      type: 'meal';
      id: string;
      name: string;
      meal: MealDetails;
      /** The whole meal is the default portion (OMA-05). */
      defaultPortion: { fraction: 1 };
      kcal: number | null;
    };

function foodFavorite(row: Food): Favorite {
  const energy = foodEnergy(row);
  const defaultPortion = hasDefaultServing(energy)
    ? ({ amount: 1, unit: 'serving' } as const)
    : null;
  const result = defaultPortion ? computeKcal({ ...energy, ...defaultPortion }) : null;
  return {
    type: 'food',
    id: row.id,
    name: row.name,
    food: row,
    defaultPortion,
    kcal: result?.ok ? result.kcal : null,
  };
}

/**
 * Favourite foods and meals with their default portions (OMA-03, LAA-02), sorted by name.
 * Deleted items are never favourites (OMA-06).
 */
export function listFavorites(ctx: ServiceContext): Favorite[] {
  const foods = ctx.db
    .select()
    .from(food)
    .where(and(eq(food.isFavorite, true), isNull(food.deletedAt)))
    .all()
    .map(foodFavorite);
  const meals = ctx.db
    .select({ id: meal.id })
    .from(meal)
    .where(and(eq(meal.isFavorite, true), isNull(meal.deletedAt)))
    .all()
    .map((row): Favorite => {
      const details = getMeal(ctx, row.id)!;
      return {
        type: 'meal',
        id: row.id,
        name: details.meal.name,
        meal: details,
        defaultPortion: { fraction: 1 },
        kcal: details.kcal,
      };
    });
  return [...foods, ...meals].sort(
    (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id.localeCompare(b.id),
  );
}
