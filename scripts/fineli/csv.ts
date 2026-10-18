// Minimal reader for Fineli's semicolon-separated open data files.

/** Decodes as UTF-8 if valid, otherwise as Latin-1 (older Fineli packages). */
export function decodeText(bytes: Uint8Array): { text: string; encoding: 'utf-8' | 'latin1' } {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text: text.replace(/^﻿/, ''), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('latin1').decode(bytes), encoding: 'latin1' };
  }
}

function splitLine(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === separator) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/** Parses CSV text into rows keyed by upper-case header names. */
export function parseCsv(text: string, separator = ';'): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const [headerLine, ...dataLines] = lines;
  if (headerLine === undefined) return [];
  const headers = splitLine(headerLine, separator).map((h) => h.toUpperCase());
  return dataLines.map((line) => {
    const values = splitLine(line, separator);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

/** Parses a number that may use a decimal comma. Empty or invalid input gives null. */
export function parseDecimal(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
