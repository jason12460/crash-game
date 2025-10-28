import { reactive, watch } from 'vue';

const STORAGE_KEY = 'crashgame_simulation';

const DEFAULT_CONFIG = {
  enabled: true,        // 默認啟用模擬模式
  updateInterval: 100   // 默認 100ms 間隔
};

// Load from localStorage or use defaults
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (
        typeof parsed.enabled === 'boolean' &&
        typeof parsed.updateInterval === 'number'
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load simulation config from storage:', e);
  }
  return { ...DEFAULT_CONFIG };
}

// Singleton state
const state = reactive(loadFromStorage());

// Watch for changes and persist to localStorage
watch(
  () => state,
  (newState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        enabled: newState.enabled,
        updateInterval: newState.updateInterval
      }));
    } catch (e) {
      console.warn('Failed to save simulation config to storage:', e);
    }
  },
  { deep: true }
);

export function useSimulationMode() {
  const enableSimulation = () => {
    state.enabled = true;
  };

  const disableSimulation = () => {
    state.enabled = false;
  };

  const setUpdateInterval = (intervalMs) => {
    const numValue = Number(intervalMs);

    // Validate: must be a positive number
    if (isNaN(numValue) || numValue <= 0) {
      console.warn(`Invalid update interval: ${intervalMs}`);
      return false;
    }

    // Reasonable bounds (10ms to 1000ms)
    if (numValue < 10 || numValue > 1000) {
      console.warn(`Update interval out of bounds (10-1000ms): ${intervalMs}`);
      return false;
    }

    state.updateInterval = numValue;
    return true;
  };

  const isSimulationEnabled = () => {
    return state.enabled;
  };

  const getUpdateInterval = () => {
    return state.updateInterval;
  };

  const resetToDefaults = () => {
    state.enabled = DEFAULT_CONFIG.enabled;
    state.updateInterval = DEFAULT_CONFIG.updateInterval;
  };

  return {
    simulationMode: state,
    enableSimulation,
    disableSimulation,
    setUpdateInterval,
    isSimulationEnabled,
    getUpdateInterval,
    resetToDefaults
  };
}
