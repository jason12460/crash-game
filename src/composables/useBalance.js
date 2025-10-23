import { reactive } from 'vue';
import { calculateWinnings, validateBetAmount } from '../utils/currency.js';

const STORAGE_KEY = 'crashgame_balance';
const DEFAULT_BALANCE = 100000; // $1000.00 in cents

/**
 * Balance Management Composable
 * Manages player balance, bet placement, and cash-out operations
 */
export function useBalance() {
  const balanceState = reactive({
    balanceCents: DEFAULT_BALANCE,
    currentBet: null, // PlayerBet object or null
    transactions: []
  });

  // Load balance from localStorage
  function loadBalance() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        balanceState.balanceCents = data.balanceCents || DEFAULT_BALANCE;
        balanceState.transactions = data.transactions || [];
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  }

  // Save balance to localStorage
  function saveBalance() {
    try {
      const data = {
        balanceCents: balanceState.balanceCents,
        transactions: balanceState.transactions.slice(-50) // Keep last 50 transactions
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, trimming transactions...');
        balanceState.transactions = balanceState.transactions.slice(-10);
        saveBalance();
      } else {
        console.error('Failed to save balance:', error);
      }
    }
  }

  // Place a bet
  function placeBet(amountCents, roundId) {
    // Validate amount
    const validation = validateBetAmount(amountCents);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Check if player has enough balance
    if (balanceState.balanceCents < amountCents) {
      return {
        success: false,
        error: 'Insufficient balance'
      };
    }

    // Check if bet already placed
    if (balanceState.currentBet && balanceState.currentBet.status === 'ACTIVE') {
      return {
        success: false,
        error: 'Bet already placed for this round'
      };
    }

    // Deduct bet from balance
    balanceState.balanceCents -= amountCents;

    // Create bet record
    const timestamp = Date.now();
    balanceState.currentBet = {
      betId: 'bet_' + timestamp + '_' + Math.random().toString(36).substr(2, 9),
      roundId,
      amountCents,
      status: 'ACTIVE',
      cashOutMultiplier: null,
      cashOutTime: null,
      winningsCents: 0,
      placedAt: timestamp
    };

    // Record transaction
    balanceState.transactions.push({
      type: 'BET',
      amountCents: -amountCents,
      balanceAfterCents: balanceState.balanceCents,
      roundId,
      timestamp
    });

    saveBalance();

    return {
      success: true,
      newBalance: balanceState.balanceCents
    };
  }

  // Cash out current bet
  function cashOut(multiplier) {
    // Check if there's an active bet
    if (!balanceState.currentBet || balanceState.currentBet.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'No active bet to cash out'
      };
    }

    // Calculate winnings
    const winningsCents = calculateWinnings(balanceState.currentBet.amountCents, multiplier);

    // Update bet status
    const timestamp = Date.now();
    balanceState.currentBet.status = 'CASHED_OUT';
    balanceState.currentBet.cashOutMultiplier = multiplier;
    balanceState.currentBet.cashOutTime = timestamp;
    balanceState.currentBet.winningsCents = winningsCents;

    // Add winnings to balance
    balanceState.balanceCents += winningsCents;

    // Record transaction
    balanceState.transactions.push({
      type: 'WIN',
      amountCents: winningsCents,
      balanceAfterCents: balanceState.balanceCents,
      roundId: balanceState.currentBet.roundId,
      timestamp
    });

    saveBalance();

    return {
      success: true,
      winningsCents,
      newBalance: balanceState.balanceCents
    };
  }

  // Mark bet as lost (called when round crashes)
  function loseBet() {
    if (!balanceState.currentBet || balanceState.currentBet.status !== 'ACTIVE') {
      return;
    }

    balanceState.currentBet.status = 'LOST';
    balanceState.currentBet.winningsCents = 0;

    // Record transaction
    balanceState.transactions.push({
      type: 'LOSS',
      amountCents: 0,
      balanceAfterCents: balanceState.balanceCents,
      roundId: balanceState.currentBet.roundId,
      timestamp: Date.now()
    });

    saveBalance();
  }

  // Clear current bet (called when new round starts)
  function clearCurrentBet() {
    balanceState.currentBet = null;
  }

  // Check if player can place bet
  function canPlaceBet(amountCents) {
    const validation = validateBetAmount(amountCents);
    if (!validation.valid) return false;
    if (balanceState.balanceCents < amountCents) return false;
    if (balanceState.currentBet && balanceState.currentBet.status === 'ACTIVE') return false;
    return true;
  }

  // Check if player can cash out
  function canCashOut() {
    return balanceState.currentBet && balanceState.currentBet.status === 'ACTIVE';
  }

  // Reset balance to default
  function resetBalance() {
    balanceState.balanceCents = DEFAULT_BALANCE;
    balanceState.currentBet = null;
    balanceState.transactions = [];
    saveBalance();
  }

  // Initialize
  loadBalance();

  return {
    balanceState,
    placeBet,
    cashOut,
    loseBet,
    clearCurrentBet,
    canPlaceBet,
    canCashOut,
    resetBalance,
    loadBalance,
    saveBalance
  };
}
