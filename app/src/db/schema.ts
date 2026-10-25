// Database schema (docs/toteutussuunnitelma.md, section 3).
// Never edit an applied migration: change this file and run `npm run db:generate`.
import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const ENERGY_BASES = ['per_100g', 'per_100ml', 'per_serving'] as const;
const SERVING_UNITS = ['g', 'ml'] as const;
const FOOD_SOURCES = ['user', 'off', 'fineli'] as const;
const PREPARATION_STATES = ['raw', 'cooked', 'prepared', 'unprepared'] as const;
const MEAL_ITEM_UNITS = ['g', 'ml', 'serving'] as const;
const LOG_UNITS = ['g', 'ml', 'serving', 'kcal'] as const;
const ORIGIN_TYPES = ['quick', 'food', 'meal'] as const;
const PUBLISH_STATES = [
  'draft',
  'awaiting_consent',
  'queued',
  'sending',
  'published',
  'failed',
  'exists_already',
] as const;

function inList(column: string, values: readonly string[]) {
  return sql.raw(`${column} IN (${values.map((v) => `'${v}'`).join(', ')})`);
}

/** Timestamps are UTC ISO 8601 strings. */
const timestamp = (name: string) => text(name).notNull();

/** Single-row settings table. */
export const settings = sqliteTable(
  'settings',
  {
    id: integer('id').primaryKey(),
    // Null until onboarding sets it (KAY-01). Applies to new fast days only (KAY-03).
    defaultLimitKcal: real('default_limit_kcal'),
    onboardingDone: integer('onboarding_done', { mode: 'boolean' }).notNull().default(false),
    schemaVersion: integer('schema_version').notNull().default(1),
  },
  (t) => [
    check('settings_singleton', sql`${t.id} = 1`),
    check(
      'settings_limit_non_negative',
      sql`${t.defaultLimitKcal} IS NULL OR ${t.defaultLimitKcal} >= 0`,
    ),
  ],
);

export const fastDay = sqliteTable(
  'fast_day',
  {
    id: text('id').primaryKey(),
    // Local calendar date YYYY-MM-DD, not a timestamp (PAI-05).
    date: text('date').notNull().unique(),
    // Snapshot of the limit when the day was created (KAY-03).
    limitKcal: real('limit_kcal').notNull(),
    createdAt: timestamp('created_at'),
  },
  (t) => [
    check('fast_day_date_format', sql`${t.date} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'`),
    check('fast_day_limit_non_negative', sql`${t.limitKcal} >= 0`),
  ],
);

export const food = sqliteTable(
  'food',
  {
    id: text('id').primaryKey(),
    source: text('source', { enum: FOOD_SOURCES }).notNull(),
    // OFF barcode or Fineli food id.
    sourceRef: text('source_ref'),
    barcode: text('barcode'),
    name: text('name').notNull(),
    brand: text('brand'),
    // Missing energy is null, never 0 (HAK-04).
    energyKcal: real('energy_kcal'),
    energyBasis: text('energy_basis', { enum: ENERGY_BASES }),
    servingAmount: real('serving_amount'),
    servingUnit: text('serving_unit', { enum: SERVING_UNITS }),
    servingLabel: text('serving_label'),
    preparationState: text('preparation_state', { enum: PREPARATION_STATES }),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    // The user's own correction to source data (HAK-08); source fields stay untouched.
    userOverrideJson: text('user_override_json'),
    fetchedAt: text('fetched_at'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
    // Soft delete keeps references valid (OMA-06).
    deletedAt: text('deleted_at'),
  },
  (t) => [
    index('food_barcode_idx').on(t.barcode),
    index('food_source_ref_idx').on(t.source, t.sourceRef),
    check('food_source', inList('source', FOOD_SOURCES)),
    check('food_energy_non_negative', sql`${t.energyKcal} IS NULL OR ${t.energyKcal} >= 0`),
    check(
      'food_energy_basis',
      sql`energy_basis IS NULL OR ${inList('energy_basis', ENERGY_BASES)}`,
    ),
    check(
      'food_serving_unit',
      sql`serving_unit IS NULL OR ${inList('serving_unit', SERVING_UNITS)}`,
    ),
    check('food_serving_positive', sql`${t.servingAmount} IS NULL OR ${t.servingAmount} > 0`),
    check(
      'food_preparation_state',
      sql`preparation_state IS NULL OR ${inList('preparation_state', PREPARATION_STATES)}`,
    ),
  ],
);

export const meal = sqliteTable('meal', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  deletedAt: text('deleted_at'),
});

/** Meal energy is always computed from its items, never stored (OMA-04). */
export const mealItem = sqliteTable(
  'meal_item',
  {
    id: text('id').primaryKey(),
    mealId: text('meal_id')
      .notNull()
      .references(() => meal.id, { onDelete: 'cascade' }),
    foodId: text('food_id')
      .notNull()
      .references(() => food.id),
    amount: real('amount').notNull(),
    unit: text('unit', { enum: MEAL_ITEM_UNITS }).notNull(),
  },
  (t) => [
    index('meal_item_meal_idx').on(t.mealId),
    check('meal_item_amount_positive', sql`${t.amount} > 0`),
    check('meal_item_unit', inList('unit', MEAL_ITEM_UNITS)),
  ],
);

/**
 * A log entry is a snapshot (KIR-08): name, amount, unit, energy and basis are stored as they
 * were when logged. origin_id is provenance only; calculations never re-read the source.
 */
export const logEntry = sqliteTable(
  'log_entry',
  {
    id: text('id').primaryKey(),
    // No cascade: deleting a fast day with entries requires explicit confirmation (PAI-06),
    // so the service layer must delete the entries first.
    fastDayId: text('fast_day_id')
      .notNull()
      .references(() => fastDay.id),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
    // Optional for quick entries (KIR-02).
    name: text('name'),
    amount: real('amount').notNull(),
    unit: text('unit', { enum: LOG_UNITS }).notNull(),
    energyKcalPerBasis: real('energy_kcal_per_basis'),
    energyBasis: text('energy_basis', { enum: ENERGY_BASES }),
    // Serving as it was when logged, so that a serving-based entry can be explained and
    // recalculated without reading the source food (KIR-08).
    servingAmount: real('serving_amount'),
    servingUnit: text('serving_unit', { enum: SERVING_UNITS }),
    servingLabel: text('serving_label'),
    // Computed, unrounded energy (LAS-03).
    kcal: real('kcal').notNull(),
    originType: text('origin_type', { enum: ORIGIN_TYPES }).notNull(),
    originId: text('origin_id'),
    // Share of a favourite meal (OMA-05).
    mealFraction: real('meal_fraction'),
  },
  (t) => [
    index('log_entry_fast_day_idx').on(t.fastDayId),
    check('log_entry_amount_non_negative', sql`${t.amount} >= 0`),
    check('log_entry_kcal_non_negative', sql`${t.kcal} >= 0`),
    check('log_entry_unit', inList('unit', LOG_UNITS)),
    check('log_entry_origin_type', inList('origin_type', ORIGIN_TYPES)),
    check(
      'log_entry_energy_basis',
      sql`energy_basis IS NULL OR ${inList('energy_basis', ENERGY_BASES)}`,
    ),
    check(
      'log_entry_energy_per_basis_non_negative',
      sql`${t.energyKcalPerBasis} IS NULL OR ${t.energyKcalPerBasis} >= 0`,
    ),
    check(
      'log_entry_serving_unit',
      sql`serving_unit IS NULL OR ${inList('serving_unit', SERVING_UNITS)}`,
    ),
    check('log_entry_serving_positive', sql`${t.servingAmount} IS NULL OR ${t.servingAmount} > 0`),
    check(
      'log_entry_meal_fraction_positive',
      sql`${t.mealFraction} IS NULL OR ${t.mealFraction} > 0`,
    ),
  ],
);

/** OFF publish queue (OFF-07, OFF-08). id doubles as the proxy idempotency key. */
export const publishJob = sqliteTable(
  'publish_job',
  {
    id: text('id').primaryKey(),
    foodId: text('food_id')
      .notNull()
      .references(() => food.id),
    barcode: text('barcode').notNull(),
    state: text('state', { enum: PUBLISH_STATES }).notNull().default('draft'),
    // Only fields the user has reviewed and approved for publishing (OFF-03, OFF-05, OFF-10).
    payloadJson: text('payload_json'),
    imagePathsJson: text('image_paths_json'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    consentedAt: text('consented_at'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [
    index('publish_job_state_idx').on(t.state),
    check('publish_job_state', inList('state', PUBLISH_STATES)),
    check('publish_job_attempts_non_negative', sql`${t.attempts} >= 0`),
  ],
);
