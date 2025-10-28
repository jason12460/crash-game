import { reactive } from 'vue';

const STORAGE_KEY = 'crashgame_debug';

/**
 * Debug Mode Composable
 * Allows manual override of crash point for testing animation performance
 */

// Shared state with default values
const debugState = reactive({
  crashPointOverride: 100, // Default: 100x crash point
  isActive: true           // Default: enabled
});

// Load from localStorage on initialization
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const data = JSON.parse(stored);
    if (data.crashPointOverride !== null && data.crashPointOverride !== undefined) {
      debugState.crashPointOverride = data.crashPointOverride;
      debugState.isActive = true;
    }
  } else {
    // No stored data, save the default values
    saveToStorage();
  }
} catch (error) {
  console.error('Failed to load debug mode state:', error);
  // On error, ensure defaults are saved
  saveToStorage();
}

function saveToStorage() {
  try {
    const data = {
      crashPointOverride: debugState.crashPointOverride
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save debug mode state:', error);
  }
}

export function useDebugMode() {
  /**
   * Set a custom crash point for the next round
   * @param {number} multiplier - Crash point (1.00 to 10000.00)
   * @returns {object} { success: boolean, error?: string }
   */
  function setDebugCrashPoint(multiplier) {
    const value = parseFloat(multiplier);

    if (isNaN(value)) {
      return { success: false, error: 'Invalid number' };
    }

    if (value < 1.00) {
      return { success: false, error: 'Minimum crash point is 1.00x' };
    }

    if (value > 10000) {
      return { success: false, error: 'Maximum crash point is 10000x' };
    }

    debugState.crashPointOverride = value;
    debugState.isActive = true;
    saveToStorage();

    return { success: true };
  }

  /**
   * Clear the debug crash point override and return to random generation
   */
  function clearDebugCrashPoint() {
    debugState.crashPointOverride = null;
    debugState.isActive = false;
    saveToStorage();
  }

  /**
   * Get the current debug crash point override
   * @returns {number|null} The override value, or null if not set
   */
  function getDebugCrashPoint() {
    return debugState.crashPointOverride;
  }

  /**
   * Check if debug mode is currently active
   * @returns {boolean} True if debug override is set
   */
  function isDebugActive() {
    return debugState.isActive && debugState.crashPointOverride !== null;
  }

  return {
    debugState,
    setDebugCrashPoint,
    clearDebugCrashPoint,
    getDebugCrashPoint,
    isDebugActive
  };
}
