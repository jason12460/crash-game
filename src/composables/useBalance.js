import { reactive } from 'vue';
import { calculateWinnings, validateBetAmount } from '../utils/currency.js';

const STORAGE_KEY = 'crashgame_balance';
const DEFAULT_BALANCE = 100000; // $1000.00 in cents

// Singleton state - shared across all instances
const balanceState = reactive({
  balanceCents: DEFAULT_BALANCE,
  currentBet: null, // PlayerBet object or null
  transactions: []
});

// Track if we've already loaded
let isLoaded = false;

/**
 * Balance Management Composable
 * Manages player balance, bet placement, and cash-out operations
 * Uses singleton pattern to ensure shared state
 */
export function useBalance() {
  // Load balance from localStorage
  function loadBalance() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        balanceState.balanceCents = data.balanceCents || DEFAULT_BALANCE;
        balanceState.transactions = data.transactions || [];
      }
      isLoaded = true;
    } catch (error) {
      console.error('Failed to load balance:', error);
      isLoaded = true;
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

    // If there's an existing bet for this round, refund it first
    let refundAmount = 0;
    if (balanceState.currentBet &&
        balanceState.currentBet.roundId === roundId &&
        balanceState.currentBet.status === 'ACTIVE') {
      refundAmount = balanceState.currentBet.amountCents;
      balanceState.balanceCents += refundAmount;
    }

    // Check if player has enough balance (after refund if any)
    if (balanceState.balanceCents < amountCents) {
      return {
        success: false,
        error: 'Insufficient balance'
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

  // Cancel current bet and refund
  function cancelBet() {
    if (!balanceState.currentBet) {
      return {
        success: false,
        error: 'No bet to cancel'
      };
    }

    // Refund the bet amount
    const refundAmount = balanceState.currentBet.amountCents;
    balanceState.balanceCents += refundAmount;

    // Record transaction
    balanceState.transactions.push({
      type: 'CANCEL',
      amountCents: refundAmount,
      balanceAfterCents: balanceState.balanceCents,
      roundId: balanceState.currentBet.roundId,
      timestamp: Date.now()
    });

    // Clear the bet
    balanceState.currentBet = null;

    saveBalance();

    return {
      success: true,
      refundedAmount: refundAmount,
      newBalance: balanceState.balanceCents
    };
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

  // Initialize only once
  if (!isLoaded) {
    loadBalance();
  }

  return {
    balanceState,
    placeBet,
    cashOut,
    cancelBet,
    loseBet,
    clearCurrentBet,
    canPlaceBet,
    canCashOut,
    resetBalance,
    loadBalance,
    saveBalance
  };
}
