import { reactive, ref, onUnmounted } from 'vue';
import { generateSeed, seedToRandom, hashSeed } from '../utils/randomGenerator.js';
import { calculateCrashPoint, calculateCurrentMultiplier } from '../utils/crashFormula.js';

/**
 * Game Engine Composable
 * Manages game round lifecycle, multiplier calculation, and crash logic
 */
export function useGameEngine() {
  const gameState = reactive({
    currentRound: {
      roundId: 0,
      seed: '',
      seedHash: '',
      crashPoint: 0,
      state: 'BETTING', // 'BETTING' | 'RUNNING' | 'CRASHED'
      startTime: 0,
      crashTime: null,
      currentMultiplier: 1.00,
      elapsedTime: 0
    },
    isRunning: false,
    countdown: 5 // Seconds until next round
  });

  let animationId = null;
  let countdownInterval = null;
  const listeners = {
    roundStart: [],
    roundCrash: [],
    multiplierUpdate: []
  };

  // Event emitter
  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(callback => callback(data));
    }
  }

  function on(event, callback) {
    if (listeners[event]) {
      listeners[event].push(callback);
    }
  }

  function off(event, callback) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    }
  }

  async function generateNewRound() {
    const seed = generateSeed();
    const random = seedToRandom(seed);
    const crashPoint = calculateCrashPoint(random);
    const seedHash = await hashSeed(seed);

    gameState.currentRound = {
      roundId: gameState.currentRound.roundId + 1,
      seed,
      seedHash,
      crashPoint,
      state: 'BETTING',
      startTime: 0,
      crashTime: null,
      currentMultiplier: 1.00,
      elapsedTime: 0
    };

    startCountdown();
  }

  function startCountdown() {
    gameState.countdown = 5;
    
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {
      gameState.countdown--;
      if (gameState.countdown <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        startRound();
      }
    }, 1000);
  }

  function startRound() {
    gameState.currentRound.state = 'RUNNING';
    gameState.currentRound.startTime = Date.now();
    gameState.isRunning = true;
    
    emit('roundStart', {
      roundId: gameState.currentRound.roundId,
      seedHash: gameState.currentRound.seedHash
    });

    gameLoop();
  }

  function gameLoop() {
    const now = Date.now();
    const elapsedMs = now - gameState.currentRound.startTime;
    gameState.currentRound.elapsedTime = elapsedMs;

    const multiplier = calculateCurrentMultiplier(elapsedMs, gameState.currentRound.crashPoint);
    gameState.currentRound.currentMultiplier = multiplier;

    emit('multiplierUpdate', {
      multiplier,
      elapsedTime: elapsedMs
    });

    // Check if crashed
    if (multiplier >= gameState.currentRound.crashPoint) {
      crashRound();
      return;
    }

    animationId = requestAnimationFrame(gameLoop);
  }

  function crashRound() {
    gameState.currentRound.state = 'CRASHED';
    gameState.currentRound.crashTime = Date.now();
    gameState.isRunning = false;

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    emit('roundCrash', {
      roundId: gameState.currentRound.roundId,
      crashPoint: gameState.currentRound.crashPoint,
      seed: gameState.currentRound.seed
    });

    // Start new round after 3 seconds
    setTimeout(() => {
      generateNewRound();
    }, 3000);
  }

  function init() {
    generateNewRound();
  }

  function cleanup() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    gameState.isRunning = false;
  }

  onUnmounted(cleanup);

  return {
    gameState,
    init,
    cleanup,
    on,
    off
  };
}
