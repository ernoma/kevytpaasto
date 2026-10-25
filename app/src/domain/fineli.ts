// Fineli food composition data (docs/adr/0003). Also used by scripts/fineli at build time, so
// this file may only have type imports.
import type { PreparationState } from './food';

/**
 * Release 20 names are all upper case ("OMENA, KUIVATTU"). Shown in sentence case like on
 * fineli.fi ("Omena, kuivattu").
 */
export function fineliDisplayName(raw: string): string {
  const lower = raw.trim().toLocaleLowerCase('fi');
  return lower.charAt(0).toLocaleUpperCase('fi') + lower.slice(1);
}

/** Lower-case text used for substring search; SQLite LIKE folds only ASCII letters. */
export function searchText(name: string): string {
  return name.toLocaleLowerCase('fi');
}

/**
 * Fineli's preparation method (PROCESS) as the app's preparation state, so that raw and cooked
 * or prepared and unprepared are told apart (LAS-06). Unknown or unspecified methods are null.
 */
const PROCESS_STATES: Readonly<Record<string, PreparationState>> = {
  RAW: 'raw',
  BOIL: 'cooked',
  BOILDR: 'cooked',
  BAK: 'cooked',
  FRIE: 'cooked',
  GRIL: 'cooked',
  ROAS: 'cooked',
  SMOK: 'cooked',
  IND: 'prepared',
  MIX: 'prepared',
  CANN: 'prepared',
  MASH: 'prepared',
  DRIE: 'prepared',
  FROZ: 'prepared',
  SALT: 'prepared',
  SOUR: 'prepared',
  SEMI: 'unprepared',
};

export function fineliPreparationState(
  process: string | null | undefined,
): PreparationState | null {
  return (process && PROCESS_STATES[process]) || null;
}

/**
 * Fineli's household units offered as servings, in display order. Technical units such as
 * kilogram, litre or "portion of 1000 kJ" are left out; grams are always available.
 */
export const FINELI_SERVING_UNITS = [
  'KPL_S',
  'KPL_M',
  'KPL_L',
  'KPL_VALM',
  'PORTS',
  'PORTM',
  'PORTL',
  'DL',
  'RKL',
  'TL',
] as const;

export type FineliServingUnit = (typeof FINELI_SERVING_UNITS)[number];

export function isFineliServingUnit(unit: string): unit is FineliServingUnit {
  return (FINELI_SERVING_UNITS as readonly string[]).includes(unit);
}

export interface FineliUnitMass {
  unit: FineliServingUnit;
  massG: number;
}

/** Usable household units of a food in display order. Masses must be positive. */
export function fineliServings(
  units: readonly { unit: string; massG: number }[],
): FineliUnitMass[] {
  return FINELI_SERVING_UNITS.flatMap((code) => {
    const found = units.find((u) => u.unit === code);
    return found && Number.isFinite(found.massG) && found.massG > 0
      ? [{ unit: code, massG: found.massG }]
      : [];
  });
}

/** The serving copied to the food row: a medium portion if Fineli has one (OMA-02). */
export function defaultFineliServing(servings: readonly FineliUnitMass[]): FineliUnitMass | null {
  return servings.find((s) => s.unit === 'PORTM') ?? servings[0] ?? null;
}

/** Search words of the typed text, lower case. Characters FTS5 would treat as syntax are dropped. */
export function searchTerms(text: string): string[] {
  return text
    .toLocaleLowerCase('fi')
    .split(/[\s,;]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}%-]/gu, ''))
    .filter((word) => word !== '');
}

/** FTS5 query matching words that start with each term, e.g. "omen kuiv" → "omen"* "kuiv"*. */
export function ftsPrefixQuery(terms: readonly string[]): string {
  return terms.map((term) => `"${term}"*`).join(' ');
}

/** Shorter input finds too many rows to be useful. */
export const MIN_SEARCH_LENGTH = 2;

export interface RankedFineliFood {
  name: string;
  /** FOOD = ingredient, DISH = composed food (Fineli FOODTYPE). */
  foodType: string | null;
}

/**
 * Sort key of a search result (docs/adr/0003): a name whose first word is the first term
 * ("Omena, kuivattu" for "omena") comes first, then names starting with it, then ingredients
 * before composed foods. FTS rank alone would put compounds such as "Omenahillo" first.
 */
export function fineliMatchRank(food: RankedFineliFood, terms: readonly string[]): number {
  const name = searchText(food.name);
  const first = terms[0] ?? '';
  const firstWord = name.split(/[\s,]+/)[0] ?? '';
  const ingredient = food.foodType === 'FOOD' ? 0 : 1;
  if (firstWord === first) return ingredient;
  if (name.startsWith(first)) return 2 + ingredient;
  return 4 + ingredient;
}

/** Results in display order: rank, then shorter (more general) names, then alphabetically. */
export function sortFineliResults<T extends RankedFineliFood>(
  foods: readonly T[],
  terms: readonly string[],
): T[] {
  return [...foods]
    .map((food) => ({ food, rank: fineliMatchRank(food, terms) }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.food.name.length - b.food.name.length ||
        a.food.name.localeCompare(b.food.name, 'fi'),
    )
    .map(({ food }) => food);
}
