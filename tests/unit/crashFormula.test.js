import { describe, it, expect } from 'vitest';
import { calculateCrashPoint, calculateCurrentMultiplier } from '../../src/utils/crashFormula.js';

describe('crashFormula', () => {
  describe('calculateCrashPoint', () => {
    it('should calculate correct crash point for R=0.5', () => {
      const crashPoint = calculateCrashPoint(0.5);
      // M = 0.97 / (1 - 0.5) = 0.97 / 0.5 = 1.94
      expect(crashPoint).toBeCloseTo(1.94, 2);
    });

    it('should calculate correct crash point for R=0.9', () => {
      const crashPoint = calculateCrashPoint(0.9);
      // M = 0.97 / (1 - 0.9) = 0.97 / 0.1 = 9.70
      expect(crashPoint).toBeCloseTo(9.70, 2);
    });

    it('should return minimum 1.00 for very small R', () => {
      const crashPoint = calculateCrashPoint(0.001);
      expect(crashPoint).toBeGreaterThanOrEqual(1.00);
    });

    it('should clamp to maximum 10000 for R close to 1', () => {
      const crashPoint = calculateCrashPoint(0.9999);
      expect(crashPoint).toBeLessThanOrEqual(10000);
    });

    it('should throw error for R = 0', () => {
      expect(() => calculateCrashPoint(0)).toThrow();
    });

    it('should throw error for R = 1', () => {
      expect(() => calculateCrashPoint(1)).toThrow();
    });

    it('should throw error for R < 0', () => {
      expect(() => calculateCrashPoint(-0.5)).toThrow();
    });
  });

  describe('calculateCurrentMultiplier', () => {
    it('should return 1.00 at time 0', () => {
      const multiplier = calculateCurrentMultiplier(0, 2.00);
      expect(multiplier).toBe(1.00);
    });

    it('should return crashPoint when time >= crash time', () => {
      const crashPoint = 3.00;
      const timeToCrash = (crashPoint - 1.00) * 1000;
      const multiplier = calculateCurrentMultiplier(timeToCrash + 100, crashPoint);
      expect(multiplier).toBe(crashPoint);
    });

    it('should return intermediate value during round', () => {
      const crashPoint = 2.00;
      const halfTime = ((crashPoint - 1.00) * 1000) / 2;
      const multiplier = calculateCurrentMultiplier(halfTime, crashPoint);
      expect(multiplier).toBeCloseTo(1.50, 1);
    });

    it('should handle negative elapsed time', () => {
      const multiplier = calculateCurrentMultiplier(-100, 2.00);
      expect(multiplier).toBe(1.00);
    });

    it('should progress linearly', () => {
      const crashPoint = 5.00;
      const quarterTime = ((crashPoint - 1.00) * 1000) / 4;
      const multiplier = calculateCurrentMultiplier(quarterTime, crashPoint);
      expect(multiplier).toBeCloseTo(2.00, 1);
    });
  });
});
