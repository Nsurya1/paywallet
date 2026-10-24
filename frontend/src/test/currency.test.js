import { describe, it, expect } from 'vitest';
import { formatPaiseToRupees, rupeesToPaise } from '../utils/currency';

describe('currency utils', () => {
  describe('formatPaiseToRupees', () => {
    it('formats 100000 paise to ₹1,000.00', () => {
      const result = formatPaiseToRupees(100000);
      // Clean non-breaking space / currency symbols for stable assertions across locales
      expect(result).toMatch(/₹\s?1,000\.00/);
    });

    it('formats 25050 paise to ₹250.50', () => {
      const result = formatPaiseToRupees(25050);
      expect(result).toMatch(/₹\s?250\.50/);
    });

    it('formats 0 paise to ₹0.00', () => {
      const result = formatPaiseToRupees(0);
      expect(result).toMatch(/₹\s?0\.00/);
    });

    it('handles null, undefined, and NaN gracefully with ₹0.00', () => {
      expect(formatPaiseToRupees(null)).toBe('₹0.00');
      expect(formatPaiseToRupees(undefined)).toBe('₹0.00');
      expect(formatPaiseToRupees(NaN)).toBe('₹0.00');
    });
  });

  describe('rupeesToPaise', () => {
    it('converts decimal rupee string to integer paise', () => {
      expect(rupeesToPaise('250.50')).toBe(25050);
      expect(rupeesToPaise('100')).toBe(10000);
      expect(rupeesToPaise('0.05')).toBe(5);
    });

    it('converts numeric values to integer paise', () => {
      expect(rupeesToPaise(100.25)).toBe(10025);
    });

    it('returns 0 for empty or invalid values', () => {
      expect(rupeesToPaise('')).toBe(0);
      expect(rupeesToPaise(null)).toBe(0);
      expect(rupeesToPaise(undefined)).toBe(0);
      expect(rupeesToPaise('invalid')).toBe(0);
    });
  });
});
