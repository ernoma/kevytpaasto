import { isNonNegativeNumber } from './amount';

export type EnergyBasis = 'per_100g' | 'per_100ml' | 'per_serving';
export type ServingUnit = 'g' | 'ml';
/** Units a food can be logged in. */
export type PortionUnit = ServingUnit | 'serving';

export interface Serving {
  /** Size of one serving, or null when only its label is known (e.g. "1 pulla"). */
  amount: number | null;
  unit: ServingUnit | null;
  label?: string | null;
}

/** Energy data of a food, or the snapshot of it in a log entry (KIR-08). */
export interface EnergyData {
  /** Null when the source has no energy; never treated as 0 (HAK-04, LAS-07). */
  energyKcal: number | null;
  basis: EnergyBasis | null;
  serving?: Serving | null;
}

export interface PortionInput extends EnergyData {
  amount: number;
  unit: PortionUnit;
}

export type PortionError =
  | 'invalid_amount'
  | 'missing_energy'
  /** g and ml are never converted to each other (LAS-02). */
  | 'incompatible_unit'
  /** The unit needs a serving size that the food does not have. */
  | 'missing_serving';

export type KcalResult = { ok: true; kcal: number } | { ok: false; error: PortionError };

const BASIS_UNIT: Record<'per_100g' | 'per_100ml', ServingUnit> = {
  per_100g: 'g',
  per_100ml: 'ml',
};

/** Size of one serving in the given unit, or null if the serving is not known in that unit. */
function servingSizeIn(serving: Serving | null | undefined, unit: ServingUnit): number | null {
  if (!serving || serving.amount === null || serving.unit !== unit) {
    return null;
  }
  return serving.amount;
}

/** Why a serving cannot be used in the given unit. */
function servingError(serving: Serving | null | undefined, unit: ServingUnit): PortionError {
  return serving?.unit && serving.unit !== unit ? 'incompatible_unit' : 'missing_serving';
}

/**
 * Converts an amount to the number of basis units: hundreds of grams or millilitres, or
 * servings. Grams and millilitres are never converted to each other (LAS-02).
 */
function basisQuantity(
  input: PortionInput,
  basis: EnergyBasis,
): { ok: true; value: number } | { ok: false; error: PortionError } {
  const { amount, unit, serving } = input;
  if (basis === 'per_serving') {
    if (unit === 'serving') {
      return { ok: true, value: amount };
    }
    const size = servingSizeIn(serving, unit);
    if (size !== null) {
      return { ok: true, value: amount / size };
    }
    return { ok: false, error: servingError(serving, unit) };
  }
  const basisUnit = BASIS_UNIT[basis];
  if (unit === basisUnit) {
    return { ok: true, value: amount / 100 };
  }
  if (unit === 'serving') {
    const size = servingSizeIn(serving, basisUnit);
    if (size !== null) {
      return { ok: true, value: (amount * size) / 100 };
    }
    return { ok: false, error: servingError(serving, basisUnit) };
  }
  return { ok: false, error: 'incompatible_unit' };
}

/**
 * Computes the unrounded energy of a portion (KIR-03, KIR-04, LAS-02, LAS-03).
 * Missing energy is reported as an error instead of being guessed (HAK-04, LAS-07).
 */
export function computeKcal(input: PortionInput): KcalResult {
  if (!isNonNegativeNumber(input.amount)) {
    return { ok: false, error: 'invalid_amount' };
  }
  if (input.energyKcal === null || input.basis === null) {
    return { ok: false, error: 'missing_energy' };
  }
  if (!isNonNegativeNumber(input.energyKcal)) {
    return { ok: false, error: 'missing_energy' };
  }
  const quantity = basisQuantity(input, input.basis);
  if (!quantity.ok) {
    return quantity;
  }
  return { ok: true, kcal: quantity.value * input.energyKcal };
}

/** Units a food can be logged in, in display order (KIR-03, LAS-02). */
export function allowedUnits(food: Omit<EnergyData, 'energyKcal'>): PortionUnit[] {
  const units: PortionUnit[] = [];
  const { basis, serving } = food;
  if (basis === 'per_100g' || basis === 'per_100ml') {
    units.push(BASIS_UNIT[basis]);
    if (servingSizeIn(serving, BASIS_UNIT[basis]) !== null) {
      units.push('serving');
    }
  } else if (basis === 'per_serving') {
    if (serving?.amount != null && serving.unit) {
      units.push(serving.unit);
    }
    units.push('serving');
  }
  return units;
}

/** True when the food has a serving that can be logged as such (OMA-02, OMA-03). */
export function hasDefaultServing(food: Omit<EnergyData, 'energyKcal'>): boolean {
  return allowedUnits(food).includes('serving');
}

export interface MealItemEnergy extends EnergyData {
  amount: number;
  unit: PortionUnit;
}

/**
 * Energy of a favourite meal computed from its items, multiplied by the share eaten
 * (OMA-04, OMA-05). Any item without usable energy makes the whole meal unknown (LAS-07).
 */
export function mealKcal(items: readonly MealItemEnergy[], fraction = 1): KcalResult {
  if (!Number.isFinite(fraction) || fraction <= 0) {
    return { ok: false, error: 'invalid_amount' };
  }
  let total = 0;
  for (const item of items) {
    const result = computeKcal(item);
    if (!result.ok) {
      return result;
    }
    total += result.kcal;
  }
  return { ok: true, kcal: total * fraction };
}
