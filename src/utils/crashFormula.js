/**
 * Crash Formula Implementation
 * Formula: M = 0.97 / (1 - R) where R is random value [0, 1)
 */

/**
 * Calculate crash point from random value
 * @param {number} randomValue - Random value between 0 and 1 (exclusive of 1)
 * @returns {number} Crash point (minimum 1.00)
 */
export function calculateCrashPoint(randomValue) {
  if (randomValue <= 0 || randomValue >= 1) {
    throw new Error('Random value must be in range (0, 1)');
  }

  const crashPoint = 0.97 / (1 - randomValue);

  // Clamp to reasonable maximum (10000x) to handle edge cases
  return Math.min(Math.max(crashPoint, 1.00), 10000);
}

/**
 * Calculate current multiplier based on elapsed time
 * @param {number} elapsedMs - Milliseconds since round started
 * @param {number} crashPoint - The target crash multiplier
 * @returns {number} Current multiplier (1.00 to crashPoint)
 */
export function calculateCurrentMultiplier(elapsedMs, crashPoint) {
  if (elapsedMs < 0) {
    return 1.00;
  }

  // Speed: 10 seconds per 1.0x increase (10000ms per multiplier point)
  const msPerMultiplier = 10000;
  const timeToCrash = (crashPoint - 1.00) * msPerMultiplier;

  if (elapsedMs >= timeToCrash) {
    return crashPoint;
  }

  // More gradual progression: starts slower, accelerates more gently
  // Using linear easing for more predictable growth
  const linearProgress = elapsedMs / timeToCrash;
  const multiplier = 1.00 + (crashPoint - 1.00) * linearProgress;

  // Round to 2 decimal places for display
  return Math.round(multiplier * 100) / 100;
}
