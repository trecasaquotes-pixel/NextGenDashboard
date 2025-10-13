/**
 * Indian Rupee formatting with Indian number system (lakhs, crores)
 * Example: 1234567.89 → ₹12,34,567.89
 */
export function formatINR(n: number): string {
  const num = safeN(n);
  const [integer, decimal] = num.toFixed(2).split('.');
  
  // Indian number system: last 3 digits, then pairs of 2
  const lastThree = integer.slice(-3);
  const otherDigits = integer.slice(0, -3);
  
  const formatted = otherDigits.length > 0
    ? otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  
  return `₹${formatted}.${decimal}`;
}

/**
 * Safely convert any value to a number, defaulting to 0 for NaN/null/undefined
 */
export function safeN(n: any): number {
  const parsed = typeof n === 'string' ? parseFloat(n) : Number(n);
  return isNaN(parsed) ? 0 : parsed;
}
