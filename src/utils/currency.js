/**
 * Currency Formatting and Calculation Utilities
 * All internal calculations use cents (integers) to avoid floating-point errors
 */

/**
 * Format cents as currency string
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted currency (e.g., "$1,234.56")
 */
export function formatCurrency(cents) {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
}

/**
 * Calculate winnings from bet and multiplier
 * Always rounds down (house advantage)
 * @param {number} betCents - Bet amount in cents
 * @param {number} multiplier - Multiplier value (e.g., 2.45)
 * @returns {number} Winnings in cents (integer)
 */
export function calculateWinnings(betCents, multiplier) {
  // Math.floor ensures we always round down
  return Math.floor(betCents * multiplier);
}

/**
 * Parse dollar input to cents
 * @param {string|number} dollarAmount - Dollar amount as string or number
 * @returns {number} Amount in cents (integer)
 */
export function dollarsToCents(dollarAmount) {
  const dollars = parseFloat(dollarAmount);
  if (isNaN(dollars)) {
    throw new Error('Invalid dollar amount');
  }
  return Math.round(dollars * 100);
}

/**
 * Validate bet amount
 * @param {number} cents - Bet amount in cents
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBetAmount(cents) {
  const MIN_BET = 100;
  const MAX_BET = 100000;

  if (!Number.isInteger(cents)) {
    return { valid: false, error: 'Bet amount must be an integer (cents)' };
  }

  if (cents < MIN_BET) {
    return { valid: false, error: 'Minimum bet is $1.00' };
  }

  if (cents > MAX_BET) {
    return { valid: false, error: 'Maximum bet is $1000.00' };
  }

  return { valid: true };
}
