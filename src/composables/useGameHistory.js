import { reactive } from 'vue';

const STORAGE_KEY = 'crashgame_history';
const MAX_RECORDS = 50;

// Singleton state - shared across all instances
const historyState = reactive({
  rounds: [], // Array of GameRoundSummary
  maxRecords: MAX_RECORDS
});

// Track if we've already loaded
let isLoaded = false;

/**
 * Game History Composable
 * Manages history of completed rounds with persistence
 * Uses singleton pattern to ensure shared state
 */
export function useGameHistory() {
  // Load history from localStorage
  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        historyState.rounds = data.rounds || [];
      }
      isLoaded = true;
    } catch (error) {
      console.error('Failed to load history:', error);
      isLoaded = true;
    }
  }

  // Save history to localStorage
  function saveHistory() {
    try {
      const data = {
        rounds: historyState.rounds
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, trimming history...');
        historyState.rounds = historyState.rounds.slice(0, 10);
        saveHistory();
      } else {
        console.error('Failed to save history:', error);
      }
    }
  }

  // Add a new round to history
  function addRound(roundSummary) {
    // Add to beginning (newest first)
    historyState.rounds.unshift(roundSummary);

    // Implement circular buffer - remove oldest if exceeds max
    if (historyState.rounds.length > historyState.maxRecords) {
      historyState.rounds.pop();
    }

    saveHistory();
  }

  // Get recent rounds
  function getRecentRounds(count = 10) {
    return historyState.rounds.slice(0, count);
  }

  // Clear all history (admin/debug)
  function clearHistory() {
    historyState.rounds = [];
    saveHistory();
  }

  // Initialize only once
  if (!isLoaded) {
    loadHistory();
  }

  return {
    historyState,
    addRound,
    getRecentRounds,
    clearHistory,
    loadHistory,
    saveHistory
  };
}
