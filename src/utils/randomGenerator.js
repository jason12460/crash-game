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
 * Simple hash function fallback (for development in non-secure contexts)
 * @param {string} str - String to hash
 * @returns {string} Hash as hex string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to positive hex string and pad to 64 chars (like SHA-256)
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return hexHash.repeat(8); // Repeat to match SHA-256 length
}

/**
 * Hash seed using SHA-256 (for provable fairness)
 * @param {string} seed - Seed to hash
 * @returns {Promise<string>} SHA-256 hash as hex string
 */
export async function hashSeed(seed) {
  // Check if crypto.subtle is available (requires HTTPS or localhost)
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(seed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('crypto.subtle.digest failed, using fallback hash:', error);
      return simpleHash(seed);
    }
  }

  // Fallback for non-secure contexts (development only)
  console.warn('crypto.subtle not available, using simple hash (development only)');
  return simpleHash(seed);
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
