/**
 * Provably Fair Random Number Generator
 * Uses Web Crypto API for cryptographically secure random values
 */

/**
 * Generate cryptographically secure random value
 * @returns {number} Random value in range [0, 1)
 */
export function generateSecureRandom() {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  // Divide by max uint32 value + 1 to get range [0, 1)
  return array[0] / (0xffffffff + 1);
}

/**
 * Generate a random seed string (16 bytes = 32 hex chars)
 * @returns {string} Hex string seed
 */
export function generateSeed() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash seed using SHA-256 (for provable fairness)
 * @param {string} seed - Seed to hash
 * @returns {Promise<string>} SHA-256 hash as hex string
 */
export async function hashSeed(seed) {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert seed to random value for crash point generation
 * @param {string} seed - Hex seed string
 * @returns {number} Random value in range (0, 1)
 */
export function seedToRandom(seed) {
  // Use first 13 hex chars of seed as random value
  const hexValue = seed.slice(0, 13);
  const numValue = parseInt(hexValue, 16);
  const maxValue = Math.pow(2, 52); // 13 hex chars = 52 bits
  const random = numValue / maxValue;
  
  // Ensure we don't get exactly 0 or 1
  return Math.max(0.0001, Math.min(0.9999, random));
}
