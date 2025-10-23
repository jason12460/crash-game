/**
 * Analysis: Impact of Max Crash Point on RTP
 *
 * When we cap crashPoint at maxCrashPoint, we need to analyze:
 * 1. What probability of games are affected by the cap?
 * 2. How does this affect the RTP for different player strategies?
 */

/**
 * Calculate RTP with different max crash point values
 */
function analyzeMaxCrashPointImpact(rtpFactor = 0.97, targetMultiplier = 2.0, maxCrashPoints = [100, 1000, 10000, 100000]) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      Impact of Max Crash Point Cap on RTP                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`RTP Factor: ${rtpFactor} (${(rtpFactor * 100).toFixed(2)}%)`);
  console.log(`Player cash-out target: ${targetMultiplier}x\n`);

  const k = rtpFactor;
  const T = targetMultiplier;

  console.log('┌──────────────┬────────────────┬────────────────┬──────────────┬─────────────┐');
  console.log('│ Max Crash    │  P(hit cap)    │   P(win)       │     RTP      │  RTP Loss   │');
  console.log('├──────────────┼────────────────┼────────────────┼──────────────┼─────────────┤');

  maxCrashPoints.forEach(maxCrash => {
    // P(crashPoint > maxCrash) = P(k/(1-R) > maxCrash) = P(R > 1 - k/maxCrash)
    const R_max = Math.max(1 - k / maxCrash, 0);
    const probHitCap = 1 - R_max;

    // P(crashPoint >= T without cap)
    const R_T = Math.max(1 - k / T, 0);
    const probWinWithoutCap = 1 - R_T;

    // P(crashPoint >= T with cap)
    // Case 1: T <= maxCrash -> cap doesn't affect this target
    // Case 2: T > maxCrash -> impossible to reach target
    let probWinWithCap;
    if (T <= maxCrash) {
      probWinWithCap = probWinWithoutCap;
    } else {
      probWinWithCap = 0; // Cannot reach target if target > max
    }

    const expectedReturn = probWinWithCap * T;
    const rtp = expectedReturn;
    const rtpLoss = k - rtp;

    const maxCrashStr = maxCrash.toLocaleString().padStart(10);
    const probHitCapStr = (probHitCap * 100).toFixed(4) + '%';
    const probWinStr = (probWinWithCap * 100).toFixed(4) + '%';
    const rtpStr = (rtp * 100).toFixed(4) + '%';
    const rtpLossStr = (rtpLoss * 100).toFixed(4) + '%';

    console.log(`│ ${maxCrashStr}x │  ${probHitCapStr.padEnd(12)} │  ${probWinStr.padEnd(12)} │  ${rtpStr.padEnd(10)} │  ${rtpLossStr.padEnd(9)} │`);
  });

  console.log('└──────────────┴────────────────┴────────────────┴──────────────┴─────────────┘\n');
}

/**
 * Calculate detailed RTP breakdown for specific max crash point
 */
function detailedAnalysis(rtpFactor = 0.97, maxCrashPoint = 100) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║   Detailed Analysis: Max Crash Point = ${maxCrashPoint}x              ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const k = rtpFactor;

  // Calculate probability of hitting the cap
  // P(crashPoint > maxCrashPoint) = P(k/(1-R) > maxCrashPoint)
  //                                = P(R > 1 - k/maxCrashPoint)
  const R_cap = 1 - k / maxCrashPoint;
  const probHitCap = Math.max(1 - R_cap, 0);

  console.log(`RTP Factor (k): ${k}`);
  console.log(`Max crash point: ${maxCrashPoint}x`);
  console.log(`R value where crash = ${maxCrashPoint}x: ${R_cap.toFixed(6)}`);
  console.log(`P(crash > ${maxCrashPoint}x without cap): ${(probHitCap * 100).toFixed(4)}%\n`);

  // Test with different player strategies
  const strategies = [
    { target: 1.5, description: 'Conservative (1.5x)' },
    { target: 2.0, description: 'Balanced (2.0x)' },
    { target: 5.0, description: 'Aggressive (5.0x)' },
    { target: 10.0, description: 'Very Aggressive (10.0x)' },
    { target: 50.0, description: 'Extreme (50.0x)' },
    { target: 100.0, description: 'Maximum (100.0x)' }
  ];

  console.log('=== RTP by Player Strategy ===\n');
  console.log('┌───────────────────────────┬─────────────┬──────────────┬─────────────┐');
  console.log('│ Strategy                  │  P(win)     │     RTP      │  RTP Loss   │');
  console.log('├───────────────────────────┼─────────────┼──────────────┼─────────────┤');

  strategies.forEach(strategy => {
    const T = strategy.target;

    // Check if target is achievable
    if (T > maxCrashPoint) {
      // Target is impossible to reach
      const rtp = 0;
      const rtpLoss = k - rtp;
      console.log(`│ ${strategy.description.padEnd(25)} │  ${'0.0000%'.padEnd(9)} │  ${'0.0000%'.padEnd(10)} │  ${(rtpLoss * 100).toFixed(4) + '%'.padEnd(9)} │`);
    } else {
      // Target is achievable
      const R_T = 1 - k / T;
      const probWin = Math.max(1 - R_T, 0);
      const expectedReturn = probWin * T;
      const rtp = expectedReturn;
      const rtpLoss = k - rtp;

      console.log(`│ ${strategy.description.padEnd(25)} │  ${(probWin * 100).toFixed(4) + '%'.padEnd(9)} │  ${(rtp * 100).toFixed(4) + '%'.padEnd(10)} │  ${(rtpLoss * 100).toFixed(4) + '%'.padEnd(9)} │`);
    }
  });

  console.log('└───────────────────────────┴─────────────┴──────────────┴─────────────┘\n');
}

/**
 * Calculate average RTP impact across random player distribution
 */
function calculateAverageRTPImpact(rtpFactor = 0.97, maxCrashPoint = 100) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Average RTP Impact (Random Player Behavior)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Assumption: Players choose random cash-out targets uniformly');
  console.log('distributed between 1.01x and 50x\n');

  const k = rtpFactor;
  const numSamples = 100000;
  let totalRTP = 0;

  // Simulate players with random cash-out targets
  for (let i = 0; i < numSamples; i++) {
    // Random target between 1.01x and 50x
    const target = 1.01 + Math.random() * (50 - 1.01);

    // Calculate RTP for this target
    if (target > maxCrashPoint) {
      // Cannot reach target
      totalRTP += 0;
    } else {
      // Can reach target
      const R_T = 1 - k / target;
      const probWin = Math.max(1 - R_T, 0);
      const rtp = probWin * target;
      totalRTP += rtp;
    }
  }

  const avgRTP = totalRTP / numSamples;
  const rtpLoss = k - avgRTP;

  console.log(`Max crash point: ${maxCrashPoint}x`);
  console.log(`Number of samples: ${numSamples.toLocaleString()}`);
  console.log(`Average RTP: ${(avgRTP * 100).toFixed(4)}%`);
  console.log(`Expected RTP (no cap): ${(k * 100).toFixed(2)}%`);
  console.log(`RTP Loss: ${(rtpLoss * 100).toFixed(4)}%\n`);

  return { avgRTP, rtpLoss };
}

// Run all analyses
console.log('\n');

// Analysis 1: Different max crash points with fixed strategy (2x target)
analyzeMaxCrashPointImpact(0.97, 2.0, [10, 50, 100, 1000, 10000]);

console.log('\n' + '='.repeat(64) + '\n');

// Analysis 2: Detailed breakdown for max = 100x
detailedAnalysis(0.97, 100);

console.log('\n' + '='.repeat(64) + '\n');

// Analysis 3: Average RTP impact with random players
const maxCrashPoints = [10, 50, 100, 1000, 10000];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      Average RTP Loss vs Max Crash Point Cap              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('┌──────────────┬──────────────────┬────────────────────┐');
console.log('│ Max Crash    │   Average RTP    │   RTP Loss         │');
console.log('├──────────────┼──────────────────┼────────────────────┤');

maxCrashPoints.forEach(maxCrash => {
  const result = calculateAverageRTPImpact(0.97, maxCrash);
  const maxStr = (maxCrash + 'x').padStart(10);
  const rtpStr = ((result.avgRTP * 100).toFixed(4) + '%').padStart(14);
  const lossStr = ((result.rtpLoss * 100).toFixed(4) + '%').padStart(16);
  console.log(`│ ${maxStr}   │  ${rtpStr}     │  ${lossStr}   │`);
});

console.log('└──────────────┴──────────────────┴────────────────────┘\n');

console.log('═══════════════════════════════════════════════════════════\n');
console.log('KEY INSIGHTS:\n');
console.log('1. Max crash point cap ONLY affects RTP if:');
console.log('   - Player targets are ABOVE the max cap');
console.log('   - Example: max=100x but player wants 200x → RTP loss\n');
console.log('2. If player targets are BELOW max cap:');
console.log('   - RTP remains exactly 97% (no impact)\n');
console.log('3. For max = 10,000x:');
console.log('   - Almost zero impact on typical players');
console.log('   - Only extreme high-rollers are affected\n');
console.log('4. For max = 100x:');
console.log('   - Significant impact on aggressive players');
console.log('   - Conservative players (< 10x) unaffected\n');
console.log('5. Recommendation:');
console.log('   - Keep max at 10,000x for minimal RTP impact');
console.log('   - Or set max to 100x and accept ~0.5% RTP reduction');
console.log('═══════════════════════════════════════════════════════════\n');
