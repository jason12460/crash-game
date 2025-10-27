/**
 * Crash Formula Implementation
 * Formula: M = 0.97 / (1 - R) where R is random value [0, 1)
 */

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
export function calculateCurrentMultiplier(elapsedMs, crashPoint) {
  if (elapsedMs < 0) {
    return 1.00;
  }

  const baseMultiplier = 1.0;
  let currentMultiplier = baseMultiplier;
  
  const growthRate = 0.0000693;
  const secondPhaseGrowthRate = 0.0000921;  
  const thirdPhaseGrowthRate = 0.0001842;
  
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
  return Math.min(currentMultiplier, crashPoint);
}
