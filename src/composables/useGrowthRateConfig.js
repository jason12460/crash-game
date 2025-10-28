import { reactive, watch } from 'vue';

const STORAGE_KEY = 'crashgame_growth_config';
const MAX_PHASES = 10;

// New array-based structure
const DEFAULT_CONFIG = {
  phases: [
    { id: 1, rate: 0.0000693, endTime: 10000 },   // 0-10s: 1x -> 2x
    { id: 2, rate: 0.0000921, endTime: 25000 },   // 10-25s: 2x -> 8x
    { id: 3, rate: 0.0001842, endTime: null }     // 25s+: 10x -> 50x (infinite)
  ]
};

// Legacy format for migration
const LEGACY_FORMAT = {
  rates: {
    phase1: 0.0000693,
    phase2: 0.0000921,
    phase3: 0.0001842
  },
  timeEndPoints: {
    phase1: 10000,
    phase2: 25000
  }
};

// Migrate legacy format to new array format
function migrateLegacyFormat(legacy) {
  return {
    phases: [
      { id: 1, rate: legacy.rates.phase1, endTime: legacy.timeEndPoints.phase1 },
      { id: 2, rate: legacy.rates.phase2, endTime: legacy.timeEndPoints.phase2 },
      { id: 3, rate: legacy.rates.phase3, endTime: null }
    ]
  };
}

// Load from localStorage or use defaults
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // Check for new array format
      if (parsed.phases && Array.isArray(parsed.phases)) {
        // Validate array structure
        const isValid = parsed.phases.every(phase =>
          typeof phase.id === 'number' &&
          typeof phase.rate === 'number' &&
          (phase.endTime === null || typeof phase.endTime === 'number')
        );

        if (isValid && parsed.phases.length > 0) {
          return parsed;
        }
      }

      // Check for legacy object format and migrate
      if (
        parsed.rates &&
        typeof parsed.rates.phase1 === 'number' &&
        typeof parsed.rates.phase2 === 'number' &&
        typeof parsed.rates.phase3 === 'number' &&
        parsed.timeEndPoints &&
        typeof parsed.timeEndPoints.phase1 === 'number' &&
        typeof parsed.timeEndPoints.phase2 === 'number'
      ) {
        console.log('Migrating legacy growth config format to array format');
        return migrateLegacyFormat(parsed);
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
        phases: newState.phases
      }));
    } catch (e) {
      console.warn('Failed to save growth config to storage:', e);
    }
  },
  { deep: true }
);

export function useGrowthRateConfig() {
  // Set growth rate for a phase by index (0-based)
  const setGrowthRate = (index, value) => {
    const numValue = Number(value);

    // Validate: must be a positive number
    if (isNaN(numValue) || numValue <= 0) {
      console.warn(`Invalid growth rate for phase ${index}: ${value}`);
      return false;
    }

    // Reasonable bounds (0.000001 to 0.001)
    if (numValue < 0.000001 || numValue > 0.001) {
      console.warn(`Growth rate out of reasonable bounds for phase ${index}: ${value}`);
      return false;
    }

    if (index < 0 || index >= state.phases.length) {
      console.warn(`Invalid phase index: ${index}`);
      return false;
    }

    state.phases[index].rate = numValue;
    return true;
  };

  // Set end time for a phase by index (0-based)
  // Last phase must have endTime = null (infinite)
  const setPhaseEndTime = (index, timeMs) => {
    if (index < 0 || index >= state.phases.length) {
      console.warn(`Invalid phase index: ${index}`);
      return false;
    }

    // Last phase must be infinite (null endTime)
    if (index === state.phases.length - 1) {
      console.warn(`Cannot set end time for last phase (must be infinite)`);
      return false;
    }

    const numValue = Number(timeMs);

    // Validate: must be a positive number
    if (isNaN(numValue) || numValue <= 0) {
      console.warn(`Invalid end time for phase ${index}: ${timeMs}`);
      return false;
    }

    // Check ordering: endTime must be > previous phase's endTime
    if (index > 0 && state.phases[index - 1].endTime !== null) {
      if (numValue <= state.phases[index - 1].endTime) {
        console.warn(
          `Phase ${index} end time (${numValue}) must be > Phase ${index - 1} end time (${state.phases[index - 1].endTime})`
        );
        return false;
      }
    }

    // Check ordering: endTime must be < next phase's endTime (if it exists and is not null)
    if (index < state.phases.length - 2 && state.phases[index + 1].endTime !== null) {
      if (numValue >= state.phases[index + 1].endTime) {
        console.warn(
          `Phase ${index} end time (${numValue}) must be < Phase ${index + 1} end time (${state.phases[index + 1].endTime})`
        );
        return false;
      }
    }

    state.phases[index].endTime = numValue;
    return true;
  };

  // Add a new phase (insert at index or append to end)
  const addPhase = (afterIndex = -1, rate = 0.0001, endTime = null) => {
    if (state.phases.length >= MAX_PHASES) {
      console.warn(`Cannot add more than ${MAX_PHASES} phases`);
      return false;
    }

    // Generate new ID
    const maxId = Math.max(...state.phases.map(p => p.id), 0);
    const newPhase = { id: maxId + 1, rate, endTime };

    if (afterIndex === -1 || afterIndex >= state.phases.length - 1) {
      // Append to end (before the last infinite phase)
      // The new phase becomes second-to-last, last phase remains infinite
      const lastPhase = state.phases[state.phases.length - 1];

      // Calculate default endTime based on previous phase
      if (state.phases.length > 1) {
        const prevPhase = state.phases[state.phases.length - 2];
        if (prevPhase.endTime !== null) {
          newPhase.endTime = prevPhase.endTime + 10000; // Add 10 seconds
        } else {
          newPhase.endTime = 10000; // Default to 10s
        }
      } else {
        newPhase.endTime = 10000; // Default to 10s
      }

      // Insert before last phase
      state.phases.splice(state.phases.length - 1, 0, newPhase);
    } else {
      // Insert after specified index
      const insertIndex = afterIndex + 1;

      // Calculate default endTime (midpoint between adjacent phases)
      const prevEndTime = state.phases[afterIndex].endTime || 0;
      const nextEndTime = state.phases[insertIndex].endTime;

      if (nextEndTime !== null) {
        newPhase.endTime = Math.floor((prevEndTime + nextEndTime) / 2);
      } else {
        newPhase.endTime = prevEndTime + 10000; // Add 10 seconds
      }

      state.phases.splice(insertIndex, 0, newPhase);
    }

    return true;
  };

  // Remove a phase by index
  const removePhase = (index) => {
    if (!canRemovePhase(index)) {
      return false;
    }

    state.phases.splice(index, 1);
    return true;
  };

  // Check if a phase can be removed
  const canRemovePhase = (index) => {
    if (index < 0 || index >= state.phases.length) {
      console.warn(`Invalid phase index: ${index}`);
      return false;
    }

    // Cannot remove if only 2 phases remain
    if (state.phases.length <= 2) {
      console.warn('Cannot remove phase: minimum 2 phases required');
      return false;
    }

    // Cannot remove the last phase (must always have an infinite phase)
    if (index === state.phases.length - 1) {
      console.warn('Cannot remove last phase (must remain infinite)');
      return false;
    }

    return true;
  };

  // Get all phases
  const getPhases = () => {
    return state.phases.map(p => ({ ...p }));
  };

  // Get phase count
  const getPhaseCount = () => {
    return state.phases.length;
  };

  // Reset to default 3-phase structure
  const resetToDefaults = () => {
    state.phases = JSON.parse(JSON.stringify(DEFAULT_CONFIG.phases));
  };

  const getDefaultConfig = () => {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  };

  // Legacy compatibility methods (for backward compatibility)
  const getGrowthRates = () => {
    const rates = {};
    state.phases.forEach((phase, index) => {
      rates[`phase${index + 1}`] = phase.rate;
    });
    return rates;
  };

  const getTimeEndPoints = () => {
    const endPoints = {};
    state.phases.forEach((phase, index) => {
      if (phase.endTime !== null) {
        endPoints[`phase${index + 1}`] = phase.endTime;
      }
    });
    return endPoints;
  };

  return {
    // New array-based API
    phases: state.phases,
    getPhases,
    getPhaseCount,
    setGrowthRate,
    setPhaseEndTime,
    addPhase,
    removePhase,
    canRemovePhase,
    resetToDefaults,
    getDefaultConfig,

    // Legacy compatibility (for gradual migration)
    rates: getGrowthRates(),
    timeEndPoints: getTimeEndPoints(),
    getGrowthRates,
    getTimeEndPoints
  };
}
