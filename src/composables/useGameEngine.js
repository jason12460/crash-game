import { reactive, ref, onUnmounted } from 'vue';
import { generateSeed, seedToRandom, hashSeed } from '../utils/randomGenerator.js';
import { calculateCrashPoint, calculateCurrentMultiplier } from '../utils/crashFormula.js';
import { useRTPConfig } from './useRTPConfig.js';
import { useDebugMode } from './useDebugMode.js';
import { useSimulationMode } from './useSimulationMode.js';

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
      elapsedTime: 0,
      debugMode: false // Whether this round uses debug crash point
    },
    isRunning: false,
    countdown: 5, // Seconds until next round
    // Curve parameters for display in debug mode
    curveExponent: 3,
    baseSpeedRatio: 0.3
  });

  let animationId = null;
  let simulationIntervalId = null;
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

  async function generateNewRound(countdownSeconds = 5) {
    const { getRTPFactor } = useRTPConfig();
    const { getDebugCrashPoint, isDebugActive } = useDebugMode();

    const seed = generateSeed();
    const random = seedToRandom(seed);

    // Check if debug mode is active and use debug crash point
    let crashPoint;
    let debugMode = false;

    if (isDebugActive()) {
      crashPoint = getDebugCrashPoint();
      debugMode = true;
    } else {
      crashPoint = calculateCrashPoint(random, getRTPFactor());
    }

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
      elapsedTime: 0,
      debugMode
    };

    // Save the new round ID
    saveRoundId(newRoundId);

    startCountdown(countdownSeconds);
  }

  function startCountdown(seconds = 5) {
    gameState.countdown = seconds;

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

    const multiplier10s = calculateCurrentMultiplier(10*1000, gameState.currentRound.crashPoint);
    const multiplier25s = calculateCurrentMultiplier(25*1000, gameState.currentRound.crashPoint);
    const multiplier35s = calculateCurrentMultiplier(35*1000, gameState.currentRound.crashPoint);
    const multiplier40s = calculateCurrentMultiplier(40*1000, gameState.currentRound.crashPoint);

    console.log('multiplier10s', multiplier10s);
    console.log('multiplier25s', multiplier25s);
    console.log('multiplier35s', multiplier35s);
    console.log('multiplier40s', multiplier40s);

    // Check simulation mode and start appropriate timer
    const { simulationMode } = useSimulationMode();
    if (simulationMode.enabled) {
      // Simulation mode: Use setInterval for discrete updates
      simulationIntervalId = setInterval(gameLoop, simulationMode.updateInterval);
      gameLoop(); // Call once immediately
    } else {
      // Smooth mode: Use requestAnimationFrame for 60 FPS
      gameLoop();
    }
  }

  function gameLoop() {
    const now = Date.now();
    const elapsedMs = now - gameState.currentRound.startTime;
    gameState.currentRound.elapsedTime = elapsedMs;

    const multiplier = calculateCurrentMultiplier(elapsedMs);
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

    // Continue loop in smooth mode (simulation mode uses setInterval)
    const { simulationMode } = useSimulationMode();
    if (!simulationMode.enabled) {
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  function crashRound() {
    gameState.currentRound.state = 'CRASHED';
    gameState.currentRound.crashTime = Date.now();
    gameState.isRunning = false;

    // Clean up both timer types
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    if (simulationIntervalId) {
      clearInterval(simulationIntervalId);
      simulationIntervalId = null;
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
    if (simulationIntervalId) {
      clearInterval(simulationIntervalId);
      simulationIntervalId = null;
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

  // Force restart current round immediately
  function forceRestartRound() {
    // Stop current round (cancels all timers)
    cleanup();

    // Start a new round with 1 second countdown
    generateNewRound(1);
  }

  onUnmounted(cleanup);

  return {
    gameState,
    init,
    cleanup,
    resetGame,
    forceRestartRound,
    on,
    off
  };
}
