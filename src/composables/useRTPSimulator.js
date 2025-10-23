/**
 * RTP Simulator Composable
 * Provides actual game-by-game simulation of crash game outcomes
 * based on fixed cash-out strategy
 */

/**
 * Generate a crash point using the same formula as the game
 * @param {number} rtpFactor - RTP factor (0.97 = 97%)
 * @returns {number} Crash point
 */
function generateCrashPoint(rtpFactor) {
  // Generate random value in (0, 1) - same as game logic
  const randomValue = Math.random();

  // Avoid exact 0 and 1 to prevent division errors
  const safeRandom = Math.max(0.00001, Math.min(randomValue, 0.99999));

  // Calculate crash point: k / (1 - R)
  const crashPoint = rtpFactor / (1 - safeRandom);

  // Apply same limits as game: min 1.00, max 10000
  return Math.min(Math.max(crashPoint, 1.00), 10000);
}

/**
 * Simulate game outcomes with fixed cash-out target
 * Now actually runs each round and generates real crash points
 *
 * @param {number} rtpFactor - RTP factor (0.01 to 1.0, e.g., 0.97 for 97%)
 * @param {number} targetMultiplier - Player's fixed cash-out target (e.g., 2.0 for 2x)
 * @param {number} numRounds - Number of rounds to simulate
 * @param {number} betAmountCents - Bet amount per round in cents
 * @returns {Object} Simulation results
 */
export function calculateSimulation(rtpFactor, targetMultiplier, numRounds, betAmountCents) {
  // Validate inputs
  if (rtpFactor <= 0 || rtpFactor > 1) {
    throw new Error('RTP factor must be between 0 and 1');
  }
  if (targetMultiplier < 1.01) {
    throw new Error('Target multiplier must be at least 1.01x');
  }
  if (numRounds < 1) {
    throw new Error('Number of rounds must be at least 1');
  }
  if (betAmountCents < 0) {
    throw new Error('Bet amount must be positive');
  }

  // Simulate each round individually
  let totalWins = 0;
  let totalLosses = 0;
  let totalPayoutCents = 0;
  let maxCrashPoint = 0;
  let minCrashPoint = Infinity;
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;

  for (let i = 0; i < numRounds; i++) {
    // Generate actual crash point for this round
    const crashPoint = generateCrashPoint(rtpFactor);

    // Track min/max crash points
    maxCrashPoint = Math.max(maxCrashPoint, crashPoint);
    minCrashPoint = Math.min(minCrashPoint, crashPoint);

    // Check if player wins (crash point >= target)
    if (crashPoint >= targetMultiplier) {
      // Win: player cashes out at target multiplier
      totalWins++;
      totalPayoutCents += betAmountCents * targetMultiplier;

      // Track consecutive wins
      consecutiveWins++;
      consecutiveLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
    } else {
      // Loss: game crashed before reaching target
      totalLosses++;
      // No payout (already lost the bet)

      // Track consecutive losses
      consecutiveLosses++;
      consecutiveWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
    }
  }

  const totalBetCents = numRounds * betAmountCents;
  const profitLossCents = totalPayoutCents - totalBetCents;
  const actualRTP = totalPayoutCents / totalBetCents;
  const winRate = totalWins / numRounds;

  // Calculate theoretical values for comparison
  const theoreticalWinRate = Math.min(rtpFactor / targetMultiplier, 1.0);
  const theoreticalRTP = rtpFactor;

  return {
    // Input parameters
    rtpFactor,
    targetMultiplier,
    numRounds,
    betAmountCents,

    // Actual simulation results
    actualWins: totalWins,
    actualLosses: totalLosses,
    winRate,

    // Financial results
    totalBetCents,
    totalPayoutCents,
    profitLossCents,

    // RTP
    actualRTP,
    actualRTPPercentage: actualRTP * 100,

    // Display values (in dollars)
    totalBetDollars: totalBetCents / 100,
    totalPayoutDollars: totalPayoutCents / 100,
    profitLossDollars: profitLossCents / 100,

    // Statistical info
    maxCrashPoint,
    minCrashPoint,
    maxConsecutiveWins,
    maxConsecutiveLosses,

    // Theoretical comparison
    theoreticalWinRate,
    theoreticalRTP,
    theoreticalRTPPercentage: theoreticalRTP * 100,

    // Variance from theory
    winRateVariance: winRate - theoreticalWinRate,
    rtpVariance: actualRTP - theoreticalRTP
  };
}

/**
 * RTP Simulator Composable
 */
export function useRTPSimulator() {
  /**
   * Run simulation with given parameters
   */
  function runSimulation(params) {
    return calculateSimulation(
      params.rtpFactor,
      params.targetMultiplier,
      params.numRounds,
      params.betAmountCents
    );
  }

  /**
   * Get recommended strategies based on RTP
   */
  function getRecommendedStrategies(rtpFactor) {
    return [
      {
        name: 'Conservative',
        targetMultiplier: 1.5,
        description: 'Low risk, high win rate',
        winRate: Math.min((rtpFactor / 1.5) * 100, 100)
      },
      {
        name: 'Balanced',
        targetMultiplier: 2.0,
        description: 'Medium risk, balanced approach',
        winRate: Math.min((rtpFactor / 2.0) * 100, 100)
      },
      {
        name: 'Aggressive',
        targetMultiplier: 5.0,
        description: 'High risk, high reward',
        winRate: Math.min((rtpFactor / 5.0) * 100, 100)
      },
      {
        name: 'Very Aggressive',
        targetMultiplier: 10.0,
        description: 'Very high risk, very high reward',
        winRate: Math.min((rtpFactor / 10.0) * 100, 100)
      }
    ];
  }

  return {
    runSimulation,
    getRecommendedStrategies
  };
}
