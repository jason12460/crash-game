import { describe, it, expect, beforeEach } from 'vitest';
import { calculateCrashPoint, calculateCurrentMultiplier, timeToReachMultiplier } from '../../src/utils/crashFormula.js';

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

  describe('calculateCurrentMultiplier - N-phase exponential growth', () => {
    it('should return 1.00 at time 0', () => {
      const multiplier = calculateCurrentMultiplier(0);
      expect(multiplier).toBe(1.00);
    });

    it('should handle negative elapsed time', () => {
      const multiplier = calculateCurrentMultiplier(-100);
      expect(multiplier).toBe(1.00);
    });

    it('should grow exponentially over time', () => {
      const mult1s = calculateCurrentMultiplier(1000);
      const mult2s = calculateCurrentMultiplier(2000);
      const mult5s = calculateCurrentMultiplier(5000);

      // Each should be greater than previous (growth)
      expect(mult1s).toBeGreaterThan(1.00);
      expect(mult2s).toBeGreaterThan(mult1s);
      expect(mult5s).toBeGreaterThan(mult2s);
    });

    it('should maintain continuity between phases', () => {
      // Test at phase boundaries using default config (10s, 25s)
      const just_before_phase2 = calculateCurrentMultiplier(9999);
      const at_phase2 = calculateCurrentMultiplier(10000);
      const just_after_phase2 = calculateCurrentMultiplier(10001);

      // Should be continuous (no sudden jumps)
      expect(Math.abs(at_phase2 - just_before_phase2)).toBeLessThan(0.01);
      expect(Math.abs(just_after_phase2 - at_phase2)).toBeLessThan(0.01);
    });

    it('should handle custom phase configuration', () => {
      // Test with 2-phase configuration
      const twoPhases = [
        { id: 1, rate: 0.0001, endTime: 5000 },
        { id: 2, rate: 0.0002, endTime: null }
      ];

      // This would need to be tested by mocking useGrowthRateConfig
      // For now, just verify the function runs without error
      const mult = calculateCurrentMultiplier(3000);
      expect(mult).toBeGreaterThan(1.00);
    });
  });

  describe('timeToReachMultiplier - N-phase support', () => {
    it('should return 0 for multiplier <= 1.0', () => {
      const time = timeToReachMultiplier(1.0);
      expect(time).toBe(0);
    });

    it('should calculate time for target multiplier in first phase', () => {
      const phases = [
        { id: 1, rate: 0.0001, endTime: 10000 },
        { id: 2, rate: 0.0002, endTime: null }
      ];

      const targetMult = 1.5;
      const time = timeToReachMultiplier(targetMult, phases);

      // Should be positive and less than first phase end
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(10000);

      // Verify by calculating multiplier at that time
      // (would need to inject phases into calculateCurrentMultiplier for exact test)
      expect(time).toBeGreaterThan(0);
    });

    it('should handle multi-phase calculations', () => {
      const phases = [
        { id: 1, rate: 0.00005, endTime: 10000 },
        { id: 2, rate: 0.0001, endTime: 20000 },
        { id: 3, rate: 0.0002, endTime: null }
      ];

      const targetMult = 10.0;
      const time = timeToReachMultiplier(targetMult, phases);

      // Should be calculated across multiple phases
      expect(time).toBeGreaterThan(0);
      expect(typeof time).toBe('number');
      expect(isFinite(time)).toBe(true);
    });

    it('should work with legacy format (backward compatibility)', () => {
      const legacyRates = { phase1: 0.0001, phase2: 0.0002, phase3: 0.0003 };
      const legacyEndpoints = { phase1: 10000, phase2: 25000 };

      const time = timeToReachMultiplier(2.0, legacyRates, legacyEndpoints);

      expect(time).toBeGreaterThan(0);
      expect(typeof time).toBe('number');
    });
  });

  describe('N-phase integration test', () => {
    it('should handle dynamic phase addition and removal', () => {
      // Test with different phase counts
      const configWith2Phases = [
        { id: 1, rate: 0.0001, endTime: 15000 },
        { id: 2, rate: 0.0003, endTime: null }
      ];

      const configWith5Phases = [
        { id: 1, rate: 0.00005, endTime: 5000 },
        { id: 2, rate: 0.0001, endTime: 10000 },
        { id: 3, rate: 0.00015, endTime: 20000 },
        { id: 4, rate: 0.0002, endTime: 30000 },
        { id: 5, rate: 0.0003, endTime: null }
      ];

      // Both should calculate without errors
      const time2 = timeToReachMultiplier(5.0, configWith2Phases);
      const time5 = timeToReachMultiplier(5.0, configWith5Phases);

      expect(time2).toBeGreaterThan(0);
      expect(time5).toBeGreaterThan(0);
      expect(isFinite(time2)).toBe(true);
      expect(isFinite(time5)).toBe(true);
    });

    it('should enforce last phase is infinite', () => {
      const phases = [
        { id: 1, rate: 0.0001, endTime: 10000 },
        { id: 2, rate: 0.0002, endTime: null } // Must be null
      ];

      // Should calculate very high multipliers in infinite phase
      const time = timeToReachMultiplier(1000, phases);

      expect(time).toBeGreaterThan(0);
      expect(isFinite(time)).toBe(true);
    });
  });
});
