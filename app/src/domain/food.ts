import { isNonNegativeNumber } from './amount';
import type { EnergyBasis, ServingUnit } from './portion';

/** Raw or cooked, prepared or unprepared, when the source tells (LAS-06). */
export type PreparationState = 'raw' | 'cooked' | 'prepared' | 'unprepared';

/** The user's own food or product (OMA-01, OMA-02). */
export interface FoodInput {
  name: string;
  brand?: string | null;
  energyKcal: number;
  basis: EnergyBasis;
  servingAmount?: number | null;
  servingUnit?: ServingUnit | null;
  /** e.g. "purkki" or "pulla" (OMA-02). */
  servingLabel?: string | null;
}

export type FoodError =
  | { field: 'name'; error: 'empty' }
  | { field: 'energyKcal'; error: 'invalid' }
  | { field: 'basis'; error: 'invalid' }
  | { field: 'servingAmount'; error: 'invalid' | 'missing' }
  | { field: 'servingUnit'; error: 'missing' | 'incompatible' };

const BASES: readonly EnergyBasis[] = ['per_100g', 'per_100ml', 'per_serving'];

/** Trims a text field; blank becomes null. */
export function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/**
 * Validates the user's own food (OMA-01, OMA-02). Energy is required and must not be negative;
 * zero is allowed on purpose (LAS-04). A serving size measured in grams cannot be used with
 * energy per 100 ml or vice versa (LAS-02).
 */
export function validateFood(input: FoodInput): FoodError[] {
  const errors: FoodError[] = [];
  if (normalizeText(input.name) === null) {
    errors.push({ field: 'name', error: 'empty' });
  }
  if (!isNonNegativeNumber(input.energyKcal)) {
    errors.push({ field: 'energyKcal', error: 'invalid' });
  }
  if (!BASES.includes(input.basis)) {
    errors.push({ field: 'basis', error: 'invalid' });
  }
  const amount = input.servingAmount ?? null;
  const unit = input.servingUnit ?? null;
  if (amount !== null && !(Number.isFinite(amount) && amount > 0)) {
    errors.push({ field: 'servingAmount', error: 'invalid' });
  }
  if (amount !== null && unit === null) {
    errors.push({ field: 'servingUnit', error: 'missing' });
  }
  if (amount === null && unit !== null) {
    errors.push({ field: 'servingAmount', error: 'missing' });
  }
  if (
    unit !== null &&
    ((input.basis === 'per_100g' && unit !== 'g') || (input.basis === 'per_100ml' && unit !== 'ml'))
  ) {
    errors.push({ field: 'servingUnit', error: 'incompatible' });
  }
  return errors;
}
