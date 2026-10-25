import { parseAmount, type AmountError } from './amount';
import {
  allowedUnits,
  computeKcal,
  hasDefaultServing,
  type EnergyData,
  type PortionError,
  type PortionUnit,
} from './portion';

/** A logged amount or meal share must be more than zero; zero is not a meaningful portion. */
export type PositiveAmountError = AmountError | 'zero';

export type PositiveAmountResult =
  { ok: true; value: number } | { ok: false; error: PositiveAmountError };

/** Parses a typed amount that must be greater than zero (LAS-05: comma or point). */
export function parsePositiveAmount(text: string): PositiveAmountResult {
  const result = parseAmount(text);
  if (!result.ok) {
    return result;
  }
  return result.value === 0 ? { ok: false, error: 'zero' } : result;
}

/** Parses an optional typed amount, e.g. a serving size: blank is null, not zero. */
export function parseOptionalAmount(
  text: string,
): { ok: true; value: number | null } | { ok: false; error: PositiveAmountError } {
  return text.trim() === '' ? { ok: true, value: null } : parsePositiveAmount(text);
}

export type PortionFormResult =
  | { ok: true; amount: number; kcal: number }
  | { ok: false; error: PositiveAmountError | PortionError };

/**
 * Evaluates the amount form before saving, so that the computed energy can be shown first
 * (KIR-03, KIR-04). Missing energy is reported, never shown as 0 (LAS-07).
 */
export function evaluatePortion(
  energy: EnergyData,
  amountText: string,
  unit: PortionUnit,
): PortionFormResult {
  const amount = parsePositiveAmount(amountText);
  if (!amount.ok) {
    return amount;
  }
  const result = computeKcal({ ...energy, amount: amount.value, unit });
  return result.ok ? { ok: true, amount: amount.value, kcal: result.kcal } : result;
}

/**
 * The form's starting point: one serving when the food has one (OMA-03), otherwise the
 * basis unit with an empty amount. Null when the food cannot be logged in any unit.
 */
export function initialPortion(
  food: Omit<EnergyData, 'energyKcal'>,
): { unit: PortionUnit; amount: number | null } | null {
  if (hasDefaultServing(food)) {
    return { unit: 'serving', amount: 1 };
  }
  const [unit] = allowedUnits(food);
  return unit ? { unit, amount: null } : null;
}
