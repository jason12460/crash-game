import { describe, it, expect } from 'vitest';
import { generateSecureRandom, generateSeed, seedToRandom, hashSeed } from '../../src/utils/randomGenerator.js';

describe('randomGenerator', () => {
  describe('generateSecureRandom', () => {
    it('should return value between 0 and 1', () => {
      const random = generateSecureRandom();
      expect(random).toBeGreaterThanOrEqual(0);
      expect(random).toBeLessThan(1);
    });

    it('should return different values on successive calls', () => {
      const random1 = generateSecureRandom();
      const random2 = generateSecureRandom();
      expect(random1).not.toBe(random2);
    });

    it('should generate 10 different values', () => {
      const values = new Set();
      for (let i = 0; i < 10; i++) {
        values.add(generateSecureRandom());
      }
      expect(values.size).toBe(10);
    });
  });

  describe('generateSeed', () => {
    it('should return 32 character hex string', () => {
      const seed = generateSeed();
      expect(seed).toHaveLength(32);
      expect(seed).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate different seeds', () => {
      const seed1 = generateSeed();
      const seed2 = generateSeed();
      expect(seed1).not.toBe(seed2);
    });
  });

  describe('seedToRandom', () => {
    it('should return value in range (0, 1)', () => {
      const seed = generateSeed();
      const random = seedToRandom(seed);
      expect(random).toBeGreaterThan(0);
      expect(random).toBeLessThan(1);
    });

    it('should return same value for same seed', () => {
      const seed = '1234567890abcdef1234567890abcdef';
      const random1 = seedToRandom(seed);
      const random2 = seedToRandom(seed);
      expect(random1).toBe(random2);
    });

    it('should return different values for different seeds', () => {
      const seed1 = '0000000000000000000000000000000';
      const seed2 = 'ffffffffffffffffffffffffffffffff';
      const random1 = seedToRandom(seed1);
      const random2 = seedToRandom(seed2);
      expect(random1).not.toBe(random2);
    });
  });

  describe('hashSeed', () => {
    it('should return 64 character hex string', async () => {
      const seed = 'test123';
      const hash = await hashSeed(seed);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return same hash for same seed', async () => {
      const seed = 'consistent';
      const hash1 = await hashSeed(seed);
      const hash2 = await hashSeed(seed);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different seeds', async () => {
      const hash1 = await hashSeed('seed1');
      const hash2 = await hashSeed('seed2');
      expect(hash1).not.toBe(hash2);
    });
  });
});
