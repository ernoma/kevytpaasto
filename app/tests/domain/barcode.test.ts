import { describe, expect, it } from 'vitest';

import { expandUpcE, gtinCheckDigit, normalizeBarcode } from '@/domain/barcode';

describe('gtinCheckDigit', () => {
  it('computes GS1 check digits for EAN-13, EAN-8 and UPC-A', () => {
    expect(gtinCheckDigit('400638133393')).toBe(1); // 4006381333931
    expect(gtinCheckDigit('9638507')).toBe(4); // 96385074
    expect(gtinCheckDigit('03600029145')).toBe(2); // 036000291452
  });
});

describe('expandUpcE', () => {
  it('expands UPC-E to UPC-A for each last-digit rule', () => {
    expect(expandUpcE('01234505')).toBe('012000003455');
    expect(expandUpcE('04252614')).toBe('042100005264');
    expect(expandUpcE('01234531')).toBe('012300000451');
    expect(expandUpcE('01234542')).toBe('012340000052');
    expect(expandUpcE('01234561')).toBe('012345000061');
  });

  it('rejects codes that are not UPC-E', () => {
    expect(expandUpcE('21234505')).toBeNull();
    expect(expandUpcE('1234567')).toBeNull();
  });
});

describe('normalizeBarcode (HAK-05, HAK-07)', () => {
  it('HAK-07: keeps a valid EAN-13 as is', () => {
    expect(normalizeBarcode('4006381333931', 'ean13')).toEqual({ ok: true, code: '4006381333931' });
  });

  it('HAK-07: keeps a valid EAN-8 as is', () => {
    expect(normalizeBarcode('96385074', 'ean8')).toEqual({ ok: true, code: '96385074' });
  });

  it('HAK-07: converts UPC-A to EAN-13 so the same product gets the same code', () => {
    expect(normalizeBarcode('036000291452', 'upc_a')).toEqual({ ok: true, code: '0036000291452' });
    expect(normalizeBarcode('036000291452')).toEqual(normalizeBarcode('0036000291452'));
  });

  it('HAK-07: converts UPC-E to EAN-13', () => {
    expect(normalizeBarcode('04252614', 'upc_e')).toEqual({ ok: true, code: '0042100005264' });
  });

  it('HAK-05: accepts typed input with spaces and dashes', () => {
    expect(normalizeBarcode(' 4 006381-333931 ')).toEqual({ ok: true, code: '4006381333931' });
  });

  it('HAK-05: rejects empty, non-numeric, wrong length and bad check digit', () => {
    expect(normalizeBarcode('  ')).toEqual({ ok: false, reason: 'empty' });
    expect(normalizeBarcode('64094A0083006')).toEqual({ ok: false, reason: 'not_digits' });
    expect(normalizeBarcode('12345')).toEqual({ ok: false, reason: 'bad_length' });
    expect(normalizeBarcode('4006381333932')).toEqual({ ok: false, reason: 'bad_check_digit' });
  });
});
