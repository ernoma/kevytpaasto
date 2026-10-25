import { describe, expect, it } from 'vitest';

import {
  defaultFineliServing,
  fineliDisplayName,
  fineliPreparationState,
  fineliServings,
  ftsPrefixQuery,
  searchTerms,
  sortFineliResults,
} from '@/domain/fineli';

describe('Fineli names and search terms', () => {
  it('shows upper-case Release 20 names in sentence case', () => {
    expect(fineliDisplayName('OMENA, KUIVATTU')).toBe('Omena, kuivattu');
    expect(fineliDisplayName('ÄYRIÄISKEITTO')).toBe('Äyriäiskeitto');
  });

  it('splits typed text into lower-case words and drops FTS syntax', () => {
    expect(searchTerms('  Omena,  KUIVattu ')).toEqual(['omena', 'kuivattu']);
    expect(searchTerms('"kana" OR * (x)')).toEqual(['kana', 'or', 'x']);
    expect(searchTerms('maito 1,5 %')).toEqual(['maito', '1', '5', '%']);
  });

  it('builds a prefix query for every word', () => {
    expect(ftsPrefixQuery(['omen', 'kuiv'])).toBe('"omen"* "kuiv"*');
  });
});

describe('preparation state (LAS-06)', () => {
  it('LAS-06: tells raw, cooked, prepared and unprepared apart', () => {
    expect(fineliPreparationState('RAW')).toBe('raw');
    expect(fineliPreparationState('BOIL')).toBe('cooked');
    expect(fineliPreparationState('BAK')).toBe('cooked');
    expect(fineliPreparationState('IND')).toBe('prepared');
    expect(fineliPreparationState('SEMI')).toBe('unprepared');
  });

  it('LAS-06: leaves unspecified or unknown methods null', () => {
    expect(fineliPreparationState('X')).toBeNull();
    expect(fineliPreparationState('NEW')).toBeNull();
    expect(fineliPreparationState(null)).toBeNull();
  });
});

describe('household units', () => {
  it('keeps usable units in display order and drops technical ones', () => {
    const servings = fineliServings([
      { unit: 'PORTM', massG: 250 },
      { unit: 'KG', massG: 1000 },
      { unit: 'DL', massG: 100 },
      { unit: 'KPL_M', massG: 120 },
      { unit: 'PORT1000KJ', massG: 95 },
      { unit: 'TL', massG: 0 },
    ]);
    expect(servings).toEqual([
      { unit: 'KPL_M', massG: 120 },
      { unit: 'PORTM', massG: 250 },
      { unit: 'DL', massG: 100 },
    ]);
    expect(defaultFineliServing(servings)).toEqual({ unit: 'PORTM', massG: 250 });
  });

  it('uses the first unit as the default without a medium portion', () => {
    expect(defaultFineliServing([{ unit: 'DL', massG: 40 }])).toEqual({ unit: 'DL', massG: 40 });
    expect(defaultFineliServing([])).toBeNull();
  });
});

describe('result order (docs/adr/0003)', () => {
  const food = (name: string, foodType = 'FOOD') => ({ name, foodType });

  it('puts the plain food before compounds and composed foods', () => {
    const sorted = sortFineliResults(
      [
        food('Omenahillo', 'DISH'),
        food('Kiisseli, omenakeitto', 'DISH'),
        food('Omena, kuivattu'),
        food('Omenalastu'),
        food('Omena, kotimainen, kuorittu'),
      ],
      ['omena'],
    );
    expect(sorted.map((f) => f.name)).toEqual([
      'Omena, kuivattu',
      'Omena, kotimainen, kuorittu',
      'Omenalastu',
      'Omenahillo',
      'Kiisseli, omenakeitto',
    ]);
  });
});
