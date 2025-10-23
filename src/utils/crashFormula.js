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
 * Speed is constant regardless of crash point
 * @param {number} elapsedMs - Milliseconds since round started
 * @param {number} crashPoint - The target crash multiplier (only used to cap the value)
 * @param {number} curveExponent - Controls acceleration (default 2.0)
 *                                 - 1.0 = linear
 *                                 - 2.0 = quadratic (moderate acceleration)
 *                                 - 3.0 = cubic (strong acceleration)
 *                                 - Higher values = more dramatic acceleration
 * @param {number} baseSpeedRatio - Ratio of base linear speed (0.0 to 1.0, default 0.3)
 *                                  - 0.0 = pure exponential (starts very slow)
 *                                  - 0.3 = 30% linear + 70% exponential (recommended)
 *                                  - 0.5 = half linear, half exponential
 *                                  - 1.0 = pure linear (no acceleration)
 * @returns {number} Current multiplier (1.00 to crashPoint)
 */
export function calculateCurrentMultiplier(elapsedMs, crashPoint, curveExponent = 2.0, baseSpeedRatio = 0.3) {
  if (elapsedMs < 0) {
    return 1.00;
  }

  // Fixed speed curve: at 10 seconds should reach 2.0x
  // This defines the time scale for our curve
  const timeScale = 10000; // 10 seconds in milliseconds
  const timeRatio = elapsedMs / timeScale;

  // Calculate multiplier using fixed speed curve (independent of crash point)
  // Linear component: provides base speed
  const linearMultiplier = 1.00 + timeRatio * 1.0;

  // Exponential component: provides acceleration
  // At t=10s, this should contribute 1.0x increase
  const exponentialMultiplier = 1.00 + Math.pow(timeRatio, curveExponent) * 1.0;

  // Blend the two curves
  const multiplier = baseSpeedRatio * linearMultiplier + (1 - baseSpeedRatio) * exponentialMultiplier;

  // Cap at crash point
  if (multiplier >= crashPoint) {
    return crashPoint;
  }

  // Round to 2 decimal places for display
  return Math.round(multiplier * 100) / 100;
}
