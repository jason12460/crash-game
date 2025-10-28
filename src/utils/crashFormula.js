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
 * Calculate current multiplier based on elapsed time using N-phase growth model
 * @param {number} elapsedMs - Milliseconds since round started
 * @returns {number} Current multiplier (starting from 1.00)
 */
export function calculateCurrentMultiplier(elapsedMs) {
  if (elapsedMs < 0) {
    return 1.00;
  }

  const baseMultiplier = 1.0;

  // Get dynamic phase configuration
  const { phases } = useGrowthRateConfig();

  if (!phases || phases.length === 0) {
    return baseMultiplier;
  }

  // Find which phase we're currently in
  let currentPhaseIndex = 0;
  for (let i = 0; i < phases.length; i++) {
    if (phases[i].endTime === null || elapsedMs < phases[i].endTime) {
      currentPhaseIndex = i;
      break;
    }
  }

  // Calculate cumulative multiplier up to current phase
  let cumulativeMultiplier = baseMultiplier;
  let previousEndTime = 0;

  // Accumulate growth from all completed phases
  for (let i = 0; i < currentPhaseIndex; i++) {
    const phase = phases[i];
    const phaseDuration = phase.endTime - previousEndTime;
    cumulativeMultiplier *= Math.pow(Math.E, phase.rate * phaseDuration);
    previousEndTime = phase.endTime;
  }

  // Add growth from current phase (partial)
  const currentPhase = phases[currentPhaseIndex];
  const timeInCurrentPhase = elapsedMs - previousEndTime;
  cumulativeMultiplier *= Math.pow(Math.E, currentPhase.rate * timeInCurrentPhase);

  return cumulativeMultiplier;
}

/**
 * Calculate time (in milliseconds) needed to reach a target multiplier
 * Uses the N-phase exponential growth model
 * @param {number} targetMultiplier - Target multiplier to reach
 * @param {object|array} ratesOrPhases - Either legacy rates object or phases array
 * @param {object} timeEndPoints - (Legacy) Time boundaries, ignored if phases array provided
 * @returns {number} Time in milliseconds needed to reach target multiplier
 */
export function timeToReachMultiplier(targetMultiplier, ratesOrPhases = null, timeEndPoints = null) {
  if (targetMultiplier <= 1.0) return 0;

  let phases;

  // Support both legacy format and new array format
  if (Array.isArray(ratesOrPhases)) {
    // New format: phases array
    phases = ratesOrPhases;
  } else if (ratesOrPhases && ratesOrPhases.phase1 !== undefined) {
    // Legacy format: convert to phases array
    const endpoints = timeEndPoints || useGrowthRateConfig().timeEndPoints;
    phases = [
      { rate: ratesOrPhases.phase1, endTime: endpoints.phase1 },
      { rate: ratesOrPhases.phase2, endTime: endpoints.phase2 },
      { rate: ratesOrPhases.phase3, endTime: null }
    ];
  } else {
    // No rates provided, get from config
    phases = useGrowthRateConfig().phases;
  }

  const baseMultiplier = 1.0;
  let cumulativeMultiplier = baseMultiplier;
  let previousEndTime = 0;

  // Iterate through phases to find where target is reached
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];

    // Calculate multiplier at end of this phase
    let phaseEndMultiplier;
    if (phase.endTime !== null) {
      const phaseDuration = phase.endTime - previousEndTime;
      phaseEndMultiplier = cumulativeMultiplier * Math.pow(Math.E, phase.rate * phaseDuration);
    } else {
      // Infinite phase - will always contain the target
      phaseEndMultiplier = Infinity;
    }

    // Check if target is reached within this phase
    if (targetMultiplier <= phaseEndMultiplier) {
      // Solve: targetMultiplier = cumulativeMultiplier * e^(rate * t)
      // t = ln(targetMultiplier / cumulativeMultiplier) / rate
      const timeInPhase = Math.log(targetMultiplier / cumulativeMultiplier) / phase.rate;
      return previousEndTime + timeInPhase;
    }

    // Target not reached yet, move to next phase
    cumulativeMultiplier = phaseEndMultiplier;
    previousEndTime = phase.endTime;
  }

  // Should never reach here if last phase is infinite
  return previousEndTime;
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
 * @param {object|array} ratesOrPhases - Either legacy rates object or phases array
 * @param {object} timeEndPoints - (Legacy) Time boundaries, ignored if phases array provided
 * @returns {number} Average game time in seconds
 */
export function calculateAverageGameTime(
  maxMultiplier = 100,
  rtpFactor = 0.97,
  ratesOrPhases = null,
  timeEndPoints = null
) {
  // Get phases (supports both legacy and new format)
  let phases;
  if (Array.isArray(ratesOrPhases)) {
    phases = ratesOrPhases;
  } else if (ratesOrPhases && ratesOrPhases.phase1 !== undefined) {
    // Legacy format
    const endpoints = timeEndPoints || useGrowthRateConfig().timeEndPoints;
    phases = [
      { rate: ratesOrPhases.phase1, endTime: endpoints.phase1 },
      { rate: ratesOrPhases.phase2, endTime: endpoints.phase2 },
      { rate: ratesOrPhases.phase3, endTime: null }
    ];
  } else {
    phases = useGrowthRateConfig().phases;
  }

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
    const timeMs = timeToReachMultiplier(m, phases);

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
    const timeAtMax = timeToReachMultiplier(maxMultiplier, phases);
    expectedTime += timeAtMax * probBeyondMax;
  }

  // Return average time in seconds
  return expectedTime / 1000;
}
