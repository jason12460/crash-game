# Data Model: Crash Game

**Feature**: Crash Game (001-crash-game)
**Date**: 2025-10-23
**Purpose**: Define data structures for game state, persistence, and domain entities

## Core Entities

### GameRound

Represents a single instance of the crash game from betting phase through crash.

**Fields**:
- `roundId` (number): Unique incrementing identifier for this round
- `seed` (string): Random seed used to generate crash point (for provable fairness)
- `seedHash` (string): SHA-256 hash of seed shown before round starts
- `crashPoint` (number): The multiplier value where the round crashes (e.g., 2.45)
- `state` (enum): Current round state - 'BETTING' | 'RUNNING' | 'CRASHED'
- `startTime` (number): Timestamp when round started (ms since epoch)
- `crashTime` (number | null): Timestamp when round crashed (null if still running)
- `currentMultiplier` (number): Current multiplier value during round (1.00 to crashPoint)
- `elapsedTime` (number): Milliseconds elapsed since round start

**State Transitions**:
```
BETTING → RUNNING → CRASHED
  ↓          ↓          ↓
 5s wait   Game Loop  New Round
```

**Validation Rules**:
- `crashPoint` must be >= 1.00
- `crashPoint` must match formula M=0.97/(1-R) where R is derived from seed
- `currentMultiplier` cannot exceed `crashPoint`
- `state` can only transition forward (BETTING → RUNNING → CRASHED)
- `elapsedTime` must be non-negative

**Derivation Logic**:
```javascript
// Calculate current multiplier based on elapsed time
function calculateMultiplier(elapsedTimeMs, crashPoint) {
  // Time to reach crash point (ms)
  const timeToC rash = calculateTimeForMultiplier(crashPoint);

  if (elapsedTimeMs >= timeTocrash) {
    return crashPoint; // Round has crashed
  }

  // Linear interpolation from 1.00x to crashPoint
  const progress = elapsedTimeMs / timeTocrash;
  return 1.00 + (crashPoint - 1.00) * progress;
}
```

### PlayerBet

Represents a player's wager in a specific round.

**Fields**:
- `betId` (string): Unique identifier for this bet (UUID or timestamp-based)
- `roundId` (number): Reference to GameRound this bet belongs to
- `amountCents` (number): Bet amount in cents (e.g., 500 = $5.00)
- `status` (enum): Bet status - 'ACTIVE' | 'CASHED_OUT' | 'LOST'
- `cashOutMultiplier` (number | null): Multiplier when player cashed out (null if not cashed)
- `cashOutTime` (number | null): Timestamp of cash-out (null if not cashed)
- `winningsCents` (number): Winnings in cents (0 if lost, amountCents * cashOutMultiplier if won)
- `placedAt` (number): Timestamp when bet was placed

**State Transitions**:
```
ACTIVE → CASHED_OUT (player cashes before crash)
   ↓
  LOST (round crashes before cash-out)
```

**Validation Rules**:
- `amountCents` must be >= 100 (min $1.00) and <= 100000 (max $1000.00)
- `amountCents` must be integer (no fractional cents)
- `cashOutMultiplier` must be >= 1.00 and <= crashPoint
- `winningsCents` must equal `Math.floor(amountCents * cashOutMultiplier)` if cashed out
- Only one ACTIVE bet allowed per round

**Calculation Logic**:
```javascript
function calculateWinnings(amountCents, cashOutMultiplier) {
  return Math.floor(amountCents * cashOutMultiplier); // Always round down
}
```

### PlayerBalance

Tracks player's available funds and transaction history.

**Fields**:
- `balanceCents` (number): Current available balance in cents
- `transactions` (array): History of balance changes (deposits, bets, winnings)

**Transaction Entry**:
```javascript
{
  type: 'BET' | 'WIN' | 'LOSS',  // Transaction type
  amountCents: number,            // Amount changed (negative for bets)
  balanceAfterCents: number,      // Balance after this transaction
  roundId: number,                // Associated round
  timestamp: number               // When transaction occurred
}
```

**Validation Rules**:
- `balanceCents` must be >= 0 (cannot go negative)
- Cannot place bet if `balanceCents < betAmountCents`
- All transaction amounts must be integers (cents)

**Operations**:
```javascript
// Place bet: deduct from balance
function placeBet(currentBalance, betAmount) {
  if (currentBalance < betAmount) {
    throw new Error('Insufficient balance');
  }
  return currentBalance - betAmount;
}

// Cash out: add winnings to balance
function addWinnings(currentBalance, winnings) {
  return currentBalance + winnings;
}
```

### GameHistory

Chronological record of completed rounds.

**Fields**:
- `rounds` (array): List of completed GameRound records
- `maxRecords` (number): Maximum rounds to keep (50)

**Stored GameRound Summary**:
```javascript
{
  roundId: number,
  crashPoint: number,
  timestamp: number,         // When round crashed
  playerBet: {               // null if player didn't bet
    amountCents: number,
    cashOutMultiplier: number | null,
    winningsCents: number,
    status: 'CASHED_OUT' | 'LOST'
  } | null
}
```

**Validation Rules**:
- Rounds stored in descending order (newest first)
- Circular buffer: when maxRecords reached, remove oldest
- All crashPoint values must be >= 1.00

**Operations**:
```javascript
// Add new round to history
function addRound(history, round) {
  history.rounds.unshift(round); // Add to beginning
  if (history.rounds.length > history.maxRecords) {
    history.rounds.pop(); // Remove oldest
  }
}

// Retrieve last N rounds
function getRecentRounds(history, count = 10) {
  return history.rounds.slice(0, count);
}
```

## LocalStorage Schema

Data persisted to browser's localStorage for cross-session persistence.

**Storage Key**: `crashgame_state`

**JSON Structure**:
```json
{
  "version": "1.0",
  "balance": {
    "balanceCents": 100000,
    "transactions": []
  },
  "history": {
    "rounds": [
      {
        "roundId": 123,
        "crashPoint": 2.45,
        "timestamp": 1729673400000,
        "playerBet": {
          "amountCents": 1000,
          "cashOutMultiplier": 2.30,
          "winningsCents": 2300,
          "status": "CASHED_OUT"
        }
      }
    ],
    "maxRecords": 50
  },
  "lastRoundId": 123
}
```

**Versioning Strategy**:
- `version` field enables future schema migrations
- If version mismatch detected, apply migration logic before loading
- If corrupted/invalid, reset to default state:

```javascript
const DEFAULT_STATE = {
  version: '1.0',
  balance: {
    balanceCents: 100000, // Start with $1000
    transactions: []
  },
  history: {
    rounds: [],
    maxRecords: 50
  },
  lastRoundId: 0
};
```

## Reactive State Structure (Vue)

How data models map to Vue reactive state in composables.

### useGameEngine

```javascript
const gameState = reactive({
  currentRound: {
    roundId: 0,
    seed: '',
    seedHash: '',
    crashPoint: 0,
    state: 'BETTING',
    startTime: 0,
    crashTime: null,
    currentMultiplier: 1.00,
    elapsedTime: 0
  },
  isRunning: false,
  countdown: 5 // Seconds until next round
});
```

### useBalance

```javascript
const balanceState = reactive({
  balanceCents: 100000,
  currentBet: null, // PlayerBet object or null
  transactions: []
});
```

### useGameHistory

```javascript
const historyState = reactive({
  rounds: [], // Array of completed GameRound summaries
  maxRecords: 50
});
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Game Loop (RAF)                        │
│                                                              │
│  1. Update currentMultiplier based on elapsedTime           │
│  2. Check if multiplier >= crashPoint → transition CRASHED  │
│  3. Emit multiplier update → Chart component                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     State Management                          │
│                                                              │
│  GameEngine (useGameEngine)  ← generates rounds             │
│  Balance (useBalance)        ← tracks bets/wins             │
│  History (useGameHistory)    ← persists completed rounds    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Persistence Layer                          │
│                                                              │
│  LocalStorage: Save balance + history on every change        │
│  Read on app mount, write on: bet placed, round complete    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   UI Components (Vue)                         │
│                                                              │
│  GameGraph      ← consumes currentMultiplier                │
│  BettingPanel   ← consumes/updates balanceState             │
│  GameHistory    ← consumes historyState.rounds              │
│  BalanceDisplay ← consumes balanceState.balanceCents        │
└─────────────────────────────────────────────────────────────┘
```

## Invariants and Constraints

Critical rules that must ALWAYS be true:

1. **Balance Integrity**: `balanceCents` cannot go negative
2. **Bet Limits**: All bets must be 100 ≤ amount ≤ 100000 cents
3. **Multiplier Bounds**: currentMultiplier always in range [1.00, crashPoint]
4. **Single Bet**: Only one ACTIVE bet allowed per round
5. **State Transitions**: Game state only moves forward (BETTING → RUNNING → CRASHED)
6. **Integer Currency**: All currency values stored as integers (cents)
7. **Timestamp Ordering**: Round crashTime >= startTime
8. **Cash-Out Timing**: Cannot cash out after crash (cashOutMultiplier < crashPoint)
9. **History Size**: Maximum 50 rounds in history (circular buffer)
10. **Provable Fairness**: crashPoint derivable from seed via documented formula

## Edge Cases Handling

| Scenario | Handling |
|----------|----------|
| LocalStorage quota exceeded | Catch error, reduce history to 10 records, retry |
| localStorage disabled | Show error, app unusable (no fallback possible) |
| Corrupted localStorage data | Reset to DEFAULT_STATE, log warning |
| Player balance exactly equals bet | Allow bet (balance becomes 0) |
| Cash out at exact crash moment | Compare timestamps: request < crash = success |
| Very high crash point (>1000x) | Allow but rare (valid per formula) |
| R value close to 0 | crashPoint approaches infinity, clamp to max 10000x |
| R value close to 1 | crashPoint close to 1.00, allowed |
| Page refresh during round | Round state lost, start new round (acceptable) |
| Negative elapsed time (clock skew) | Clamp to 0, log warning |

## Indexes and Lookups

For efficient data access:

- **Current Round**: Always in memory (gameState.currentRound), no lookup needed
- **History**: Array lookup by index, already sorted newest-first
- **Balance**: Single value, no index needed
- **Round by ID**: Linear search in history (max 50 items, O(n) acceptable)

No complex indexing needed given small dataset size.
