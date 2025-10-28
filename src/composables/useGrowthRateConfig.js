import { reactive, watch } from 'vue';

const STORAGE_KEY = 'crashgame_growth_rates';

const DEFAULT_RATES = {
  phase1: 0.0000693,   // 0-10s: 1x -> 2x
  phase2: 0.0000921,   // 10-25s: 2x -> 8x
  phase3: 0.0001842    // 25s+: 10x -> 50x
};

// Load from localStorage or use defaults
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that all required keys exist and are numbers
      if (
        typeof parsed.phase1 === 'number' &&
        typeof parsed.phase2 === 'number' &&
        typeof parsed.phase3 === 'number'
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load growth rates from storage:', e);
  }
  return { ...DEFAULT_RATES };
}

// Singleton state
const state = reactive({
  rates: loadFromStorage()
});

// Watch for changes and persist to localStorage
watch(
  () => state.rates,
  (newRates) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRates));
    } catch (e) {
      console.warn('Failed to save growth rates to storage:', e);
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

  const getGrowthRates = () => {
    return { ...state.rates };
  };

  const resetToDefaults = () => {
    state.rates.phase1 = DEFAULT_RATES.phase1;
    state.rates.phase2 = DEFAULT_RATES.phase2;
    state.rates.phase3 = DEFAULT_RATES.phase3;
  };

  const getDefaultRates = () => {
    return { ...DEFAULT_RATES };
  };

  return {
    rates: state.rates,
    setGrowthRate,
    getGrowthRates,
    resetToDefaults,
    getDefaultRates
  };
}
