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

  // Get growth rates and time boundaries from config (allows real-time adjustment)
  const { rates, timeEndPoints } = useGrowthRateConfig();
  const growthRate = rates.phase1;
  const secondPhaseGrowthRate = rates.phase2;
  const thirdPhaseGrowthRate = rates.phase3;
  const phase1End = timeEndPoints.phase1;
  const phase2End = timeEndPoints.phase2;

  // 分段增長模型 - 使用累積方式避免斷層
  if (elapsedMs < phase1End) {
    // Phase 1: 慢增長階段
    currentMultiplier = baseMultiplier * Math.pow(Math.E, growthRate * elapsedMs);
  } else if (elapsedMs < phase2End) {
    // Phase 2: 中等增長階段
    // 先計算 Phase 1 的倍數
    const firstPhaseMultiplier = baseMultiplier * Math.pow(Math.E, growthRate * phase1End);
    // 再計算剩餘時間的增長
    const remainingTime = elapsedMs - phase1End;

    currentMultiplier = firstPhaseMultiplier * Math.pow(Math.E, secondPhaseGrowthRate * remainingTime);
  } else {
    // Phase 3: 快速增長階段
    // 先計算前兩階段的倍數
    const firstPhaseMultiplier = baseMultiplier * Math.pow(Math.E, growthRate * phase1End);
    const phase2Duration = phase2End - phase1End;
    const secondPhaseMultiplier = firstPhaseMultiplier * Math.pow(Math.E, secondPhaseGrowthRate * phase2Duration);
    // 再計算剩餘時間的增長
    const remainingTime = elapsedMs - phase2End;
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
 * @param {object} timeEndPoints - Time boundaries {phase1, phase2} in milliseconds
 * @returns {number} Time in milliseconds needed to reach target multiplier
 */
export function timeToReachMultiplier(targetMultiplier, rates, timeEndPoints = null) {
  if (targetMultiplier <= 1.0) return 0;

  // Use provided timeEndPoints or get from config
  const endpoints = timeEndPoints || useGrowthRateConfig().timeEndPoints;
  const phase1End = endpoints.phase1;
  const phase2End = endpoints.phase2;

  const baseMultiplier = 1.0;

  // Calculate phase endpoint multipliers
  const multPhase1End = baseMultiplier * Math.pow(Math.E, rates.phase1 * phase1End);
  const phase2Duration = phase2End - phase1End;
  const multPhase2End = multPhase1End * Math.pow(Math.E, rates.phase2 * phase2Duration);

  // Phase 1
  if (targetMultiplier <= multPhase1End) {
    // Solve: targetMultiplier = e^(r1 * t)
    // t = ln(targetMultiplier) / r1
    return Math.log(targetMultiplier) / rates.phase1;
  }

  // Phase 2
  if (targetMultiplier <= multPhase2End) {
    // Solve: targetMultiplier = multPhase1End * e^(r2 * (t - phase1End))
    // t = phase1End + ln(targetMultiplier / multPhase1End) / r2
    const exponent = Math.log(targetMultiplier / multPhase1End) / rates.phase2;
    return phase1End + exponent;
  }

  // Phase 3
  // Solve: targetMultiplier = multPhase2End * e^(r3 * (t - phase2End))
  // t = phase2End + ln(targetMultiplier / multPhase2End) / r3
  const exponent = Math.log(targetMultiplier / multPhase2End) / rates.phase3;
  return phase2End + exponent;
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
  rates,
  timeEndPoints = null
) {
  // Get time endpoints
  const endpoints = timeEndPoints || useGrowthRateConfig().timeEndPoints;

  // Numerical integration using adaptive sampling
  // Split into regions based on probability density

  let expectedTime = 0;

  // Integration parameters
  const minMultiplier = rtpFactor; // Minimum possible crash point
  const integrationSteps = 10000; // Fine-grained integration

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
    const timeMs = timeToReachMultiplier(m, rates, endpoints);

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
    const timeAtMax = timeToReachMultiplier(maxMultiplier, rates, endpoints);
    expectedTime += timeAtMax * probBeyondMax;
  }

  // Return average time in seconds
  return expectedTime / 1000;
}
