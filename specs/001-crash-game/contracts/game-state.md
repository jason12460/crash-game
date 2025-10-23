# Game State Contracts: Crash Game

**Feature**: Crash Game (001-crash-game)
**Date**: 2025-10-23
**Type**: Client-side state contracts (no API endpoints)
**Purpose**: Define the public interfaces for composables and state management

> **Note**: This is a frontend-only application, so there are no REST/GraphQL API contracts. Instead, this document defines the contracts for Vue composables that manage client-side state.

## Composable Contracts

### useGameEngine()

**Purpose**: Manages game round lifecycle, multiplier calculation, and crash logic.

**Exports**:

```typescript
interface UseGameEngine {
  // Reactive state (readonly)
  readonly gameState: {
    currentRound: GameRound;
    isRunning: boolean;
    countdown: number; // Seconds until next round (during BETTING phase)
  };

  // Methods
  startRound(): void;
  stopRound(): void;
  init(): void; // Initialize game engine, start first round
  cleanup(): void; // Stop game loop, clean up timers
}

interface GameRound {
  roundId: number;
  seed: string;
  seedHash: string;
  crashPoint: number;
  state: 'BETTING' | 'RUNNING' | 'CRASHED';
  startTime: number;
  crashTime: number | null;
  currentMultiplier: number;
  elapsedTime: number;
}
```

**Behavior**:

1. **init()**:
   - Generates first round with random seed
   - Sets state to 'BETTING'
   - Starts 5-second countdown
   - When countdown reaches 0, calls startRound()

2. **startRound()**:
   - Transitions state from 'BETTING' to 'RUNNING'
   - Records startTime
   - Begins requestAnimationFrame loop
   - Updates currentMultiplier every frame
   - When currentMultiplier >= crashPoint, transitions to 'CRASHED'

3. **stopRound()**:
   - Transitions state to 'CRASHED'
   - Records crashTime
   - Cancels animation frame loop
   - Saves round to history
   - After 3 seconds, generates new round and returns to 'BETTING'

**Events Emitted** (via Vue provide/inject or custom event system):

- `roundStart`: Fired when round transitions to 'RUNNING'
- `roundCrash`: Fired when round transitions to 'CRASHED' with { roundId, crashPoint }
- `multiplierUpdate`: Fired every frame with { multiplier, elapsedTime }

**Invariants**:
- `currentMultiplier` always in range [1.00, crashPoint]
- State transitions only go forward: BETTING → RUNNING → CRASHED
- Round cannot start if previous round not cleaned up

---

### useBalance()

**Purpose**: Manages player balance, bet placement, and cash-out operations.

**Exports**:

```typescript
interface UseBalance {
  // Reactive state (readonly)
  readonly balanceState: {
    balanceCents: number;
    currentBet: PlayerBet | null;
    transactions: Transaction[];
  };

  // Methods
  placeBet(amountCents: number, roundId: number): BetResult;
  cashOut(multiplier: number): CashOutResult;
  canPlaceBet(amountCents: number): boolean;
  canCashOut(): boolean;
  resetBalance(): void; // Admin: reset to $1000
  loadBalance(): void; // Load from localStorage
  saveBalance(): void; // Save to localStorage
}

interface PlayerBet {
  betId: string;
  roundId: number;
  amountCents: number;
  status: 'ACTIVE' | 'CASHED_OUT' | 'LOST';
  cashOutMultiplier: number | null;
  cashOutTime: number | null;
  winningsCents: number;
  placedAt: number;
}

interface BetResult {
  success: boolean;
  error?: string; // 'insufficient_balance' | 'bet_already_placed' | 'invalid_amount'
  newBalance?: number;
}

interface CashOutResult {
  success: boolean;
  error?: string; // 'no_active_bet' | 'round_not_running' | 'already_cashed_out'
  winningsCents?: number;
  newBalance?: number;
}

interface Transaction {
  type: 'BET' | 'WIN' | 'LOSS';
  amountCents: number;
  balanceAfterCents: number;
  roundId: number;
  timestamp: number;
}
```

**Behavior**:

1. **placeBet(amountCents, roundId)**:
   - Validates: amount in range [100, 100000], balance sufficient, no existing bet
   - If valid: deduct amount from balance, create PlayerBet with status 'ACTIVE'
   - Record 'BET' transaction
   - Save balance to localStorage
   - Return success with new balance

2. **cashOut(multiplier)**:
   - Validates: currentBet exists, status is 'ACTIVE', round is 'RUNNING'
   - Calculate winnings: `Math.floor(currentBet.amountCents * multiplier)`
   - Update currentBet: set cashOutMultiplier, winningsCents, status 'CASHED_OUT'
   - Add winnings to balance
   - Record 'WIN' transaction
   - Save balance to localStorage
   - Return success with winnings and new balance

3. **canPlaceBet(amountCents)**:
   - Returns true if: balance >= amount, no currentBet, amount in valid range

4. **canCashOut()**:
   - Returns true if: currentBet exists, status is 'ACTIVE', round is 'RUNNING'

**Validation Rules**:
- Bet amount must be integer (cents)
- Bet amount must be 100 ≤ amount ≤ 100000
- Balance cannot go negative
- Only one active bet per round
- Cannot cash out during BETTING or CRASHED states

**Side Effects**:
- All balance changes immediately persisted to localStorage
- Emits balance change events for UI updates

---

### useGameHistory()

**Purpose**: Manages history of completed rounds with persistence.

**Exports**:

```typescript
interface UseGameHistory {
  // Reactive state (readonly)
  readonly historyState: {
    rounds: GameRoundSummary[];
    maxRecords: number;
  };

  // Methods
  addRound(round: GameRoundSummary): void;
  getRecentRounds(count?: number): GameRoundSummary[];
  clearHistory(): void; // Admin: clear all history
  loadHistory(): void; // Load from localStorage
  saveHistory(): void; // Save to localStorage
}

interface GameRoundSummary {
  roundId: number;
  crashPoint: number;
  timestamp: number;
  playerBet: {
    amountCents: number;
    cashOutMultiplier: number | null;
    winningsCents: number;
    status: 'CASHED_OUT' | 'LOST';
  } | null; // null if player didn't bet this round
}
```

**Behavior**:

1. **addRound(round)**:
   - Add round to beginning of array (unshift)
   - If array length > maxRecords (50), remove last item (pop)
   - Save to localStorage
   - Emit 'historyUpdated' event

2. **getRecentRounds(count = 10)**:
   - Return first `count` rounds from array (most recent)
   - Default to 10 if not specified

3. **clearHistory()**:
   - Empty rounds array
   - Save to localStorage

**Persistence**:
- Auto-saves to localStorage on every addRound call
- Implements circular buffer (max 50 rounds)
- Handles localStorage errors gracefully (logs warning, continues)

---

## Data Persistence Contract

### LocalStorage Keys and Schema

**Primary Key**: `crashgame_state`

**Schema Version**: `1.0`

**Read Operation**:
```typescript
function loadState(): AppState | null {
  try {
    const json = localStorage.getItem('crashgame_state');
    if (!json) return null;

    const state = JSON.parse(json);

    // Version check
    if (state.version !== '1.0') {
      console.warn('Schema version mismatch, migrating...');
      return migrateState(state);
    }

    // Validation
    if (!validateState(state)) {
      console.error('Invalid state, resetting...');
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to load state:', error);
    return null; // Will trigger reset to default
  }
}
```

**Write Operation**:
```typescript
function saveState(state: AppState): void {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem('crashgame_state', json);
  } catch (error) {
    // Handle quota exceeded
    if (error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded, trimming history...');
      state.history.rounds = state.history.rounds.slice(0, 10);
      localStorage.setItem('crashgame_state', JSON.stringify(state));
    } else {
      console.error('Failed to save state:', error);
    }
  }
}
```

**Default State** (used on first load or corruption):
```typescript
const DEFAULT_STATE: AppState = {
  version: '1.0',
  balance: {
    balanceCents: 100000, // $1000.00
    transactions: []
  },
  history: {
    rounds: [],
    maxRecords: 50
  },
  lastRoundId: 0
};
```

---

## Component Prop Contracts

### GameGraph.vue

**Props**:
```typescript
interface GameGraphProps {
  currentMultiplier: number;      // Current multiplier value
  crashPoint: number | null;      // Crash point (null if not determined)
  state: 'BETTING' | 'RUNNING' | 'CRASHED';
  history: number[];              // Recent crash points for reference
}
```

**Events**:
- None (display only)

**Behavior**:
- Renders line chart with time on X-axis, multiplier on Y-axis
- Updates in real-time as currentMultiplier changes
- Shows crash point as red line/marker
- Displays previous crash points as dots/markers

---

### BettingPanel.vue

**Props**:
```typescript
interface BettingPanelProps {
  balanceCents: number;
  canPlaceBet: boolean;
  canCashOut: boolean;
  currentMultiplier: number;
  state: 'BETTING' | 'RUNNING' | 'CRASHED';
}
```

**Events**:
```typescript
emit('placeBet', amountCents: number);
emit('cashOut');
```

**Behavior**:
- During BETTING: show bet input and "Place Bet" button
- During RUNNING with active bet: show "Cash Out" button with current potential winnings
- During RUNNING without bet: show "Round in progress, wait for next round"
- During CRASHED: show round results, countdown to next round

---

### GameHistory.vue

**Props**:
```typescript
interface GameHistoryProps {
  rounds: GameRoundSummary[];
  maxDisplay?: number; // Default 20
}
```

**Events**:
- None (display only)

**Behavior**:
- Renders scrollable list of past rounds
- Shows roundId, crashPoint, timestamp, player result (if applicable)
- Color codes: green for wins, red for losses, gray for no bet
- Newest rounds at top

---

### BalanceDisplay.vue

**Props**:
```typescript
interface BalanceDisplayProps {
  balanceCents: number;
}
```

**Events**:
- None (display only)

**Behavior**:
- Displays formatted balance: `$1,234.56`
- Animates on change (smooth transition)
- Shows warning if balance < 100 (can't place minimum bet)

---

## Event Bus Contract (Optional)

If using a global event bus for cross-component communication:

**Events**:

1. **`game:roundStart`**
   - Payload: `{ roundId: number, seedHash: string }`
   - Emitted when: Round transitions to RUNNING
   - Listeners: BettingPanel, GameGraph

2. **`game:roundCrash`**
   - Payload: `{ roundId: number, crashPoint: number }`
   - Emitted when: Round transitions to CRASHED
   - Listeners: useBalance (to resolve active bets), GameHistory, BettingPanel

3. **`game:multiplierUpdate`**
   - Payload: `{ multiplier: number, elapsedTime: number }`
   - Emitted when: Every animation frame during RUNNING
   - Listeners: GameGraph, BettingPanel (for potential winnings display)

4. **`balance:changed`**
   - Payload: `{ balanceCents: number, change: number }`
   - Emitted when: Balance increases or decreases
   - Listeners: BalanceDisplay, BettingPanel

5. **`bet:placed`**
   - Payload: `{ amountCents: number, roundId: number }`
   - Emitted when: Player successfully places bet
   - Listeners: BettingPanel (to update UI state)

6. **`bet:cashedOut`**
   - Payload: `{ winningsCents: number, multiplier: number }`
   - Emitted when: Player successfully cashes out
   - Listeners: BettingPanel, BalanceDisplay

---

## Error Handling Contract

All composables and components must handle errors gracefully:

**Error Types**:

```typescript
type GameError =
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_BET_AMOUNT'
  | 'BET_ALREADY_PLACED'
  | 'NO_ACTIVE_BET'
  | 'ROUND_NOT_RUNNING'
  | 'STORAGE_ERROR'
  | 'INVALID_STATE';

interface ErrorResult {
  error: GameError;
  message: string;
  userMessage: string; // User-friendly message for display
}
```

**Error Handling Pattern**:

```typescript
// Composable method
function placeBet(amountCents: number): BetResult {
  if (balanceState.balanceCents < amountCents) {
    return {
      success: false,
      error: 'INSUFFICIENT_BALANCE',
      userMessage: 'Insufficient balance to place this bet'
    };
  }
  // ... success path
}

// Component usage
const result = placeBet(betAmount);
if (!result.success) {
  showToast(result.userMessage, 'error');
  return;
}
```

**User-Facing Error Messages**:

| Error Code | User Message |
|------------|--------------|
| INSUFFICIENT_BALANCE | "Insufficient balance to place this bet" |
| INVALID_BET_AMOUNT | "Bet must be between $1.00 and $1000.00" |
| BET_ALREADY_PLACED | "You already have an active bet this round" |
| NO_ACTIVE_BET | "No active bet to cash out" |
| ROUND_NOT_RUNNING | "Cannot cash out, round is not running" |
| STORAGE_ERROR | "Failed to save game data. Check browser settings." |
| INVALID_STATE | "Game state error. Please refresh the page." |

---

## Performance Contracts

**Target Metrics** (from spec success criteria):

- **Graph updates**: Minimum 10 FPS, target 60 FPS
- **Frame time**: < 16ms per frame (60 FPS = 16.67ms per frame)
- **Cash-out response**: < 200ms from button click to state update
- **History load**: < 1 second to display 50 records
- **localStorage operations**: < 50ms for read/write

**Optimization Requirements**:

1. **useGameEngine**: Use requestAnimationFrame, not setInterval
2. **GameGraph**: Limit data points to last 200, use canvas rendering
3. **localStorage**: Debounce writes (max 1 write per 100ms)
4. **Balance calculations**: Use integer math, no float operations
5. **History**: Lazy load, render only visible items (virtual scrolling if >100 items)

---

## Testing Contract

**Critical Paths to Test** (if tests implemented):

1. **Multiplier Calculation**:
   - Input: elapsedTime, crashPoint
   - Output: currentMultiplier in range [1.00, crashPoint]
   - Test edge cases: elapsedTime=0, elapsedTime >= crash time

2. **Crash Point Generation**:
   - Input: random seed
   - Output: crashPoint >= 1.00
   - Verify formula: M = 0.97 / (1 - R)
   - Test edge cases: R near 0, R near 1

3. **Bet Validation**:
   - Test: amount < 100 → reject
   - Test: amount > 100000 → reject
   - Test: balance < amount → reject
   - Test: valid amount, sufficient balance → accept

4. **Winnings Calculation**:
   - Input: betAmount, multiplier
   - Output: `Math.floor(betAmount * multiplier)`
   - Verify always rounds down

5. **LocalStorage Persistence**:
   - Save state → reload → verify state matches
   - Test corruption handling → resets to default
   - Test quota exceeded → trims history

**Test File Locations** (if implemented):
- `tests/unit/crashFormula.test.js`
- `tests/unit/randomGenerator.test.js`
- `tests/unit/useBalance.test.js`

---

## Summary

This contract defines:

1. **Three core composables**: useGameEngine, useBalance, useGameHistory
2. **Four UI components**: GameGraph, BettingPanel, GameHistory, BalanceDisplay
3. **Persistence layer**: LocalStorage with versioning and error handling
4. **Event system**: Optional event bus for cross-component communication
5. **Error handling**: Typed errors with user-friendly messages
6. **Performance targets**: 60 FPS, <200ms response times
7. **Testing requirements**: Critical game logic paths

All contracts are client-side only (no API endpoints). State management follows Vue 3 Composition API patterns with reactive refs and readonly exports.
