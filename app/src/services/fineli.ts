import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { food } from '@/db/schema';
import type { PreparationState } from '@/domain/food';
import {
  fineliServings,
  ftsPrefixQuery,
  MIN_SEARCH_LENGTH,
  searchTerms,
  sortFineliResults,
  type FineliUnitMass,
} from '@/domain/fineli';
import type { EnergyData, Serving } from '@/domain/portion';

import type { ServiceContext } from './context';
import { timestamp } from './context';
import { ServiceError } from './errors';
import type { Food } from './foods';

/** Name of the attached read-only Fineli database (plan section 3.2). */
export const FINELI_SCHEMA = 'fineli';

/** A food in the attached fineli.db. Energy is always per 100 g of edible part (LAS-02). */
export interface FineliFood {
  id: number;
  name: string;
  /** Null when Fineli has no energy value; never 0 (HAK-04). */
  energyKcal: number | null;
  /** FOOD = ingredient, DISH = composed food. */
  foodType: string | null;
  /** Fineli's own description of the preparation method, e.g. "Keitetty" (LAS-06). */
  processFi: string | null;
  preparationState: PreparationState | null;
}

export interface FineliFoodDetails extends FineliFood {
  /** Household units with their mass in grams, e.g. a medium portion or a decilitre. */
  servings: FineliUnitMass[];
}

interface FineliRow {
  id: number;
  name_fi: string;
  energy_kcal_per_100g: number | null;
  food_type: string | null;
  process_fi: string | null;
  preparation_state: PreparationState | null;
}

function toFineliFood(row: FineliRow): FineliFood {
  return {
    id: row.id,
    name: row.name_fi,
    energyKcal: row.energy_kcal_per_100g,
    foodType: row.food_type,
    processFi: row.process_fi,
    preparationState: row.preparation_state,
  };
}

const COLUMNS = sql.raw(
  'f.id, f.name_fi, f.energy_kcal_per_100g, f.food_type, f.process_fi, f.preparation_state',
);

/** True when fineli.db is attached; search still works for own foods without it. */
export function isFineliAvailable(ctx: ServiceContext): boolean {
  const rows = ctx.db.all<{ name: string }>(
    sql`SELECT name FROM pragma_database_list WHERE name = ${FINELI_SCHEMA}`,
  );
  return rows.length > 0;
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Searches Fineli locally, without network (HAK-02, LAA-04). Words are matched as prefixes
 * through the FTS5 index; terms of 3 or more letters also match inside compound words
 * ("puuro" finds "Kaurapuuro"). Results are ordered as in docs/adr/0003.
 */
export function searchFineli(ctx: ServiceContext, text: string, limit = 30): FineliFood[] {
  const terms = searchTerms(text);
  if (terms.join('').length < MIN_SEARCH_LENGTH) {
    return [];
  }
  const prefixMatch = sql`f.id IN (SELECT rowid FROM fineli.fineli_food_fts WHERE fineli_food_fts MATCH ${ftsPrefixQuery(terms)})`;
  const substringMatch = terms.every((term) => term.length >= 3)
    ? sql.join(
        terms.map((term) => sql`f.search_text LIKE ${`%${escapeLike(term)}%`} ESCAPE '\\'`),
        sql` AND `,
      )
    : sql`0`;
  const rows = ctx.db.all<FineliRow>(
    sql`SELECT ${COLUMNS} FROM fineli.fineli_food f WHERE ${prefixMatch} OR (${substringMatch})`,
  );
  return sortFineliResults(rows.map(toFineliFood), terms).slice(0, limit);
}

/** A Fineli food with its household units, or null if the id is unknown. */
export function getFineliFood(ctx: ServiceContext, id: number): FineliFoodDetails | null {
  const [row] = ctx.db.all<FineliRow>(
    sql`SELECT ${COLUMNS} FROM fineli.fineli_food f WHERE f.id = ${id}`,
  );
  if (!row) {
    return null;
  }
  const units = ctx.db.all<{ unit: string; mass_g: number }>(
    sql`SELECT unit, mass_g FROM fineli.fineli_food_unit WHERE food_id = ${id}`,
  );
  return {
    ...toFineliFood(row),
    servings: fineliServings(units.map((u) => ({ unit: u.unit, massG: u.mass_g }))),
  };
}

/** Energy data of a Fineli food, optionally with one of its servings (in grams). */
export function fineliEnergy(item: FineliFood, serving: Serving | null = null): EnergyData {
  return { energyKcal: item.energyKcal, basis: 'per_100g', serving };
}

/** The copy of a Fineli food in the food table, or null if it has not been logged yet. */
export function findFineliCopy(ctx: ServiceContext, fineliId: number): Food | null {
  return (
    ctx.db
      .select()
      .from(food)
      .where(
        and(
          eq(food.source, 'fineli'),
          eq(food.sourceRef, String(fineliId)),
          isNull(food.deletedAt),
        ),
      )
      .orderBy(asc(food.createdAt))
      .get() ?? null
  );
}

/**
 * Copies a Fineli food to the food table (source = fineli) when it is first logged (plan
 * section 3.2), or returns the earlier copy. A copy whose source values differ from the
 * current fineli.db is refreshed, like a cached product; log entries are snapshots and do not
 * change (KIR-08).
 */
export function ensureFineliFood(
  ctx: ServiceContext,
  fineliId: number,
  defaultServing: Serving | null,
): Food {
  const source = getFineliFood(ctx, fineliId);
  if (!source) {
    throw new ServiceError('not_found', `Fineli food ${fineliId} not found`);
  }
  const now = timestamp(ctx);
  const values = {
    name: source.name,
    energyKcal: source.energyKcal,
    energyBasis: 'per_100g' as const,
    servingAmount: defaultServing?.amount ?? null,
    servingUnit: defaultServing?.amount != null ? ('g' as const) : null,
    servingLabel: defaultServing?.label ?? null,
    preparationState: source.preparationState,
  };
  const existing = findFineliCopy(ctx, fineliId);
  if (existing) {
    if (
      existing.name === values.name &&
      existing.energyKcal === values.energyKcal &&
      existing.preparationState === values.preparationState
    ) {
      return existing;
    }
    return ctx.db
      .update(food)
      .set({ ...values, fetchedAt: now, updatedAt: now })
      .where(eq(food.id, existing.id))
      .returning()
      .get()!;
  }
  return ctx.db
    .insert(food)
    .values({
      id: ctx.newId(),
      source: 'fineli',
      sourceRef: String(fineliId),
      ...values,
      fetchedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}
