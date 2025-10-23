import { reactive, ref, onUnmounted } from 'vue';
import { generateSeed, seedToRandom, hashSeed } from '../utils/randomGenerator.js';
import { calculateCrashPoint, calculateCurrentMultiplier } from '../utils/crashFormula.js';
import { useRTPConfig } from './useRTPConfig.js';

const STORAGE_KEY = 'crashgame_engine';

/**
 * Game Engine Composable
 * Manages game round lifecycle, multiplier calculation, and crash logic
 */
export function useGameEngine() {
  // Load last round ID from localStorage
  let lastRoundId = 0;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      lastRoundId = data.lastRoundId || 0;
    }
  } catch (error) {
    console.error('Failed to load game engine state:', error);
  }

  const gameState = reactive({
    currentRound: {
      roundId: lastRoundId,
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

  // Save round ID to localStorage
  function saveRoundId(roundId) {
    try {
      const data = { lastRoundId: roundId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save round ID:', error);
    }
  }

  async function generateNewRound() {
    const { getRTPFactor } = useRTPConfig();
    const seed = generateSeed();
    const random = seedToRandom(seed);
    const crashPoint = calculateCrashPoint(random, getRTPFactor());
    const seedHash = await hashSeed(seed);

    const newRoundId = gameState.currentRound.roundId + 1;

    gameState.currentRound = {
      roundId: newRoundId,
      seed,
      seedHash,
      crashPoint,
      state: 'BETTING',
      startTime: 0,
      crashTime: null,
      currentMultiplier: 1.00,
      elapsedTime: 0
    };

    // Save the new round ID
    saveRoundId(newRoundId);

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

    // Adjust acceleration curve:
    // CURVE_EXPONENT: 1.0 = linear, 2.0 = moderate, 3.0 = strong, higher = more dramatic
    // BASE_SPEED_RATIO: 0.0 = pure exponential, 0.3 = recommended, 1.0 = pure linear
    const CURVE_EXPONENT = 3;
    const BASE_SPEED_RATIO = 0.3;  // 30% linear base speed + 70% exponential acceleration
    const multiplier = calculateCurrentMultiplier(elapsedMs, gameState.currentRound.crashPoint, CURVE_EXPONENT, BASE_SPEED_RATIO);
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

  // Reset round ID and game state
  function resetGame() {
    // Stop current round
    cleanup();

    // Clear the localStorage completely to ensure clean reset
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear game engine state:', error);
    }

    // Reset round ID to 0 (next round will be #1)
    gameState.currentRound.roundId = 0;

    // Restart the game
    init();
  }

  onUnmounted(cleanup);

  return {
    gameState,
    init,
    cleanup,
    resetGame,
    on,
    off
  };
}
