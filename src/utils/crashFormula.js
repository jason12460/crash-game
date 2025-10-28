/**
 * Crash Formula Implementation
 * Formula: M = 0.97 / (1 - R) where R is random value [0, 1)
 */

import { useGrowthRateConfig } from '@/composables/useGrowthRateConfig';

/**
 * Calculate crash point from random value
 * @param {number} randomValue - Random value between 0 and 1 (exclusive of 1)
 * @param {number} rtpFactor - RTP factor (0.01 to 1.0, default 0.97 = 97% RTP)
 * @returns {number} Crash point (minimum 1.00)
 */
export function calculateCrashPoint(randomValue, rtpFactor = 0.97) {
  if (randomValue <= 0 || randomValue >= 1) {
    throw new Error('Random value must be in range (0, 1)');
  }

  if (rtpFactor <= 0 || rtpFactor > 1) {
    throw new Error('RTP factor must be in range (0, 1]');
  }

  const crashPoint = rtpFactor / (1 - randomValue);

  // Clamp to reasonable maximum (10000x) to handle edge cases
  return Math.min(Math.max(crashPoint, 1.00), 10000);
}

/**
 * Calculate current multiplier based on elapsed time using segmented growth model
 * @param {number} elapsedMs - Milliseconds since round started
 * @param {number} crashPoint - The target crash multiplier (only used to cap the value)
 * @returns {number} Current multiplier (1.00 to crashPoint)
 */
export function calculateCurrentMultiplier(elapsedMs) {
  if (elapsedMs < 0) {
    return 1.00;
  }

  const baseMultiplier = 1.0;
  let currentMultiplier = baseMultiplier;

  // Get growth rates from config (allows real-time adjustment)
  const { rates } = useGrowthRateConfig();
  const growthRate = rates.phase1;              // 前10秒：1x -> 2x
  const secondPhaseGrowthRate = rates.phase2;   // 10-25秒：2x -> 8x
  const thirdPhaseGrowthRate = rates.phase3;    // 25-35秒：10x -> 50x
  
  // 分段增長模型 - 使用累積方式避免斷層
  if (elapsedMs < 10000) {
    // 前10秒：慢增長階段 (1x -> 2x)
    currentMultiplier = baseMultiplier * Math.pow(Math.E, growthRate * elapsedMs);
  } else if (elapsedMs < 25000) {
    // 10-25秒：中等增長階段 (2x -> 10x)
    // 先計算前10秒的倍數
    const firstPhaseMultiplier = baseMultiplier * Math.pow(Math.E, growthRate * 10000);
    // 再計算剩餘時間的增長
    const remainingTime = elapsedMs - 10000;
    
    currentMultiplier = firstPhaseMultiplier * Math.pow(Math.E, secondPhaseGrowthRate * remainingTime);
  } else {
    // 25秒後：快速增長階段 (10x -> 100x)
    // 先計算前25秒的倍數
    const firstPhaseMultiplier = baseMultiplier * Math.pow(Math.E, growthRate * 10000);
    const secondPhaseMultiplier = firstPhaseMultiplier * Math.pow(Math.E, secondPhaseGrowthRate * 15000);
    // 再計算剩餘時間的增長
    const remainingTime = elapsedMs - 25000;
    currentMultiplier = secondPhaseMultiplier * Math.pow(Math.E, thirdPhaseGrowthRate * remainingTime);
  }
  
  // 確保不超過爆炸點
  return currentMultiplier;
}

/**
 * Calculate time (in milliseconds) needed to reach a target multiplier
 * Uses the three-phase exponential growth model
 * @param {number} targetMultiplier - Target multiplier to reach
 * @param {object} rates - Growth rates object {phase1, phase2, phase3}
 * @returns {number} Time in milliseconds needed to reach target multiplier
 */
export function timeToReachMultiplier(targetMultiplier, rates) {
  if (targetMultiplier <= 1.0) return 0;

  const baseMultiplier = 1.0;

  // Calculate phase endpoints
  const mult10s = baseMultiplier * Math.pow(Math.E, rates.phase1 * 10000);
  const mult25s = mult10s * Math.pow(Math.E, rates.phase2 * 15000);

  // Phase 1: 0-10s
  if (targetMultiplier <= mult10s) {
    // Solve: targetMultiplier = e^(r1 * t)
    // ln(targetMultiplier) = r1 * t
    // t = ln(targetMultiplier) / r1
    return Math.log(targetMultiplier) / rates.phase1;
  }

  // Phase 2: 10-25s
  if (targetMultiplier <= mult25s) {
    // Solve: targetMultiplier = mult10s * e^(r2 * (t - 10000))
    // targetMultiplier / mult10s = e^(r2 * (t - 10000))
    // ln(targetMultiplier / mult10s) = r2 * (t - 10000)
    // t = 10000 + ln(targetMultiplier / mult10s) / r2
    const exponent = Math.log(targetMultiplier / mult10s) / rates.phase2;
    return 10000 + exponent;
  }

  // Phase 3: 25s+
  // Solve: targetMultiplier = mult25s * e^(r3 * (t - 25000))
  // ln(targetMultiplier / mult25s) = r3 * (t - 25000)
  // t = 25000 + ln(targetMultiplier / mult25s) / r3
  const exponent = Math.log(targetMultiplier / mult25s) / rates.phase3;
  return 25000 + exponent;
}

/**
 * Calculate average game time using mathematical expectation
 * Considers crash point probability distribution with a maximum cash-out limit
 *
 * Crash point formula: M = rtpFactor / (1 - R) where R ~ Uniform(0,1)
 * PDF of M: f(m) = rtpFactor / m^2 for m >= rtpFactor
 *
 * E[Time] = ∫ time(m) * f(m) dm
 *
 * @param {number} maxMultiplier - Maximum cash-out multiplier (e.g., 100)
 * @param {number} rtpFactor - RTP factor (default 0.97)
 * @param {object} rates - Growth rates object {phase1, phase2, phase3}
 * @returns {number} Average game time in seconds
 */
export function calculateAverageGameTime(
  maxMultiplier = 100,
  rtpFactor = 0.97,
  rates
) {
  // Numerical integration using adaptive sampling
  // Split into regions based on probability density

  let expectedTime = 0;

  // Integration parameters
  const minMultiplier = rtpFactor; // Minimum possible crash point
  const integrationSteps = 10000; // Fine-grained integration

  // Calculate multiplier endpoints for each phase
  const mult10s = Math.pow(Math.E, rates.phase1 * 10000);
  const mult25s = mult10s * Math.pow(Math.E, rates.phase2 * 15000);

  // Determine effective max (capped at maxMultiplier)
  const effectiveMax = Math.min(maxMultiplier, 10000);

  // Numerical integration using trapezoidal rule
  // E[Time] = ∫[minMultiplier to effectiveMax] time(m) * pdf(m) dm
  // where pdf(m) = rtpFactor / m^2

  const dm = (effectiveMax - minMultiplier) / integrationSteps;

  for (let i = 0; i <= integrationSteps; i++) {
    const m = minMultiplier + i * dm;

    // Skip if multiplier is below minimum
    if (m < rtpFactor) continue;

    // PDF of crash point: f(m) = rtpFactor / m^2
    const pdf = rtpFactor / (m * m);

    // Time to reach this multiplier
    const timeMs = timeToReachMultiplier(m, rates);

    // Contribution to expected value
    // Use trapezoidal rule: weight by 0.5 for endpoints, 1.0 for interior points
    const weight = (i === 0 || i === integrationSteps) ? 0.5 : 1.0;

    expectedTime += timeMs * pdf * dm * weight;
  }

  // Add contribution from crashes beyond maxMultiplier (if any)
  // P(M > maxMultiplier) = P(rtpFactor/(1-R) > maxMultiplier)
  //                      = P(R > 1 - rtpFactor/maxMultiplier)
  //                      = rtpFactor/maxMultiplier
  const probBeyondMax = rtpFactor / maxMultiplier;
  if (probBeyondMax > 0 && maxMultiplier < 10000) {
    const timeAtMax = timeToReachMultiplier(maxMultiplier, rates);
    expectedTime += timeAtMax * probBeyondMax;
  }

  // Return average time in seconds
  return expectedTime / 1000;
}
