import { formatDecimal } from '@/domain/format';
import type { PortionError, PortionUnit, Serving, EnergyData } from '@/domain/portion';
import type { PositiveAmountError } from '@/domain/portionForm';

import { strings } from './strings.fi';

/** Size of a serving for display, e.g. "200 g", or null when it is not known. */
function servingSize(serving: Serving | null | undefined): string | null {
  return serving?.amount != null && serving.unit
    ? `${formatDecimal(serving.amount)} ${strings.units[serving.unit]}`
    : null;
}

/** Label of a unit choice: "g", "ml" or the serving, e.g. "purkki (200 g)" (OMA-02). */
export function unitLabel(unit: PortionUnit, serving: Serving | null | undefined): string {
  if (unit !== 'serving') {
    return strings.units[unit];
  }
  return strings.portion.servingUnit(serving?.label ?? null, servingSize(serving));
}

/** Energy and its basis, e.g. "80 kcal / 100 g" (KIR-04: the basis is shown with the value). */
export function energyText(energy: EnergyData): string {
  if (energy.energyKcal === null || energy.basis === null) {
    return strings.noEnergy;
  }
  const basis =
    energy.basis === 'per_serving' && energy.serving?.label
      ? energy.serving.label
      : strings.basis[energy.basis];
  return strings.energyPer(formatDecimal(energy.energyKcal), basis);
}

/** An amount with its unit, e.g. "150 g" or "1 purkki (200 g)". */
export function amountText(amount: number, unit: PortionUnit, serving?: Serving | null): string {
  return `${formatDecimal(amount)} ${unitLabel(unit, serving)}`;
}

export function portionErrorMessage(error: PositiveAmountError | PortionError): string {
  return strings.portionError[error];
}
