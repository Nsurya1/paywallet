/**
 * Converts minor currency units (paise/cents) to formatted major currency units (INR rupees).
 * E.g., 100000 paise -> "₹1,000.00"
 */
export function formatPaiseToRupees(paise, currency = 'INR') {
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
 * E.g. "250.50" -> 25050
 */
export function rupeesToPaise(rupees) {
  if (!rupees || isNaN(rupees)) return 0;
  return Math.round(parseFloat(rupees) * 100);
}
