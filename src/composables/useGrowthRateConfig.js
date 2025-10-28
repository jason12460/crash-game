import { reactive, watch } from 'vue';

const STORAGE_KEY = 'crashgame_growth_config';

const DEFAULT_CONFIG = {
  rates: {
    phase1: 0.0000693,   // 0-10s: 1x -> 2x
    phase2: 0.0000921,   // 10-25s: 2x -> 8x
    phase3: 0.0001842    // 25s+: 10x -> 50x
  },
  timeEndPoints: {
    phase1: 10000,  // Phase 1 ends at 10s (in ms)
    phase2: 25000   // Phase 2 ends at 25s (in ms)
  }
};

// Load from localStorage or use defaults
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (
        parsed.rates &&
        typeof parsed.rates.phase1 === 'number' &&
        typeof parsed.rates.phase2 === 'number' &&
        typeof parsed.rates.phase3 === 'number' &&
        parsed.timeEndPoints &&
        typeof parsed.timeEndPoints.phase1 === 'number' &&
        typeof parsed.timeEndPoints.phase2 === 'number'
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load growth config from storage:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

// Singleton state
const state = reactive(loadFromStorage());

// Watch for changes and persist to localStorage
watch(
  () => state,
  (newState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        rates: newState.rates,
        timeEndPoints: newState.timeEndPoints
      }));
    } catch (e) {
      console.warn('Failed to save growth config to storage:', e);
    }
  },
  { deep: true }
);

export function useGrowthRateConfig() {
  const setGrowthRate = (phase, value) => {
    const numValue = Number(value);

    // Validate: must be a positive number
    if (isNaN(numValue) || numValue <= 0) {
      console.warn(`Invalid growth rate for phase ${phase}: ${value}`);
      return false;
    }

    // Reasonable bounds (0.000001 to 0.001)
    if (numValue < 0.000001 || numValue > 0.001) {
      console.warn(`Growth rate out of reasonable bounds for phase ${phase}: ${value}`);
      return false;
    }

    if (phase === 1) state.rates.phase1 = numValue;
    else if (phase === 2) state.rates.phase2 = numValue;
    else if (phase === 3) state.rates.phase3 = numValue;
    else {
      console.warn(`Invalid phase: ${phase}`);
      return false;
    }

    return true;
  };

  const setPhaseEndTime = (phase, timeMs) => {
    const numValue = Number(timeMs);

    // Validate: must be a positive number
    if (isNaN(numValue) || numValue <= 0) {
      console.warn(`Invalid end time for phase ${phase}: ${timeMs}`);
      return false;
    }

    if (phase === 1) {
      // Phase 1 end must be > 0
      if (numValue <= 0) {
        console.warn(`Phase 1 end time must be > 0: ${numValue}`);
        return false;
      }
      // Phase 1 end must be < Phase 2 end
      if (numValue >= state.timeEndPoints.phase2) {
        console.warn(`Phase 1 end (${numValue}) must be < Phase 2 end (${state.timeEndPoints.phase2})`);
        return false;
      }
      state.timeEndPoints.phase1 = numValue;
    } else if (phase === 2) {
      // Phase 2 end must be > Phase 1 end
      if (numValue <= state.timeEndPoints.phase1) {
        console.warn(`Phase 2 end (${numValue}) must be > Phase 1 end (${state.timeEndPoints.phase1})`);
        return false;
      }
      state.timeEndPoints.phase2 = numValue;
    } else {
      console.warn(`Invalid phase: ${phase}`);
      return false;
    }

    return true;
  };

  const getGrowthRates = () => {
    return { ...state.rates };
  };

  const getTimeEndPoints = () => {
    return { ...state.timeEndPoints };
  };

  const resetToDefaults = () => {
    state.rates.phase1 = DEFAULT_CONFIG.rates.phase1;
    state.rates.phase2 = DEFAULT_CONFIG.rates.phase2;
    state.rates.phase3 = DEFAULT_CONFIG.rates.phase3;
    state.timeEndPoints.phase1 = DEFAULT_CONFIG.timeEndPoints.phase1;
    state.timeEndPoints.phase2 = DEFAULT_CONFIG.timeEndPoints.phase2;
  };

  const getDefaultConfig = () => {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  };

  return {
    rates: state.rates,
    timeEndPoints: state.timeEndPoints,
    setGrowthRate,
    setPhaseEndTime,
    getGrowthRates,
    getTimeEndPoints,
    resetToDefaults,
    getDefaultConfig
  };
}
