import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Reads the source text so that template literals and function-built strings are covered too.
const source = readFileSync(new URL('../../src/ui/strings.fi.ts', import.meta.url), 'utf8');

/** Removes comments, which are not user-visible and may use the abbreviation. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('user-visible strings (TIE-03)', () => {
  it('always name Open Food Facts in full, never as the abbreviation OFF', () => {
    const lines = stripComments(source)
      .split('\n')
      .filter((line) => /\bOFF\b/.test(line));
    expect(lines).toEqual([]);
  });
});
