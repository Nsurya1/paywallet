/**
 * Converts minor currency units (paise) to formatted Indian Rupee string (₹).
 * E.g., 12500050 paise -> "₹1,25,000.50"
 */
export function formatPaiseToRupees(paise: number | null | undefined, currency: string = 'INR'): string {
  if (paise === null || paise === undefined || isNaN(paise)) {
    return '₹0.00';
  }
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Converts user input rupees to minor currency units (paise).
 * E.g., "125000.50" -> 12500050
 */
export function rupeesToPaise(rupees: string | number | null | undefined): number {
  if (!rupees || isNaN(Number(rupees))) return 0;
  return Math.round(parseFloat(String(rupees)) * 100);
}

/**
 * Returns raw numeric rupees from paise.
 * E.g., 50000 -> 500.00
 */
export function paiseToRupeesNumber(paise: number | null | undefined): number {
  if (!paise || isNaN(paise)) return 0;
  return Number(paise) / 100;
}
