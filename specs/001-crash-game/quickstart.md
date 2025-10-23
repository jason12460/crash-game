# Quickstart Guide: Crash Game Development

**Feature**: Crash Game (001-crash-game)
**Date**: 2025-10-23
**Purpose**: Get the development environment set up and running quickly

## Prerequisites

Before starting, ensure you have:

- **Node.js**: Version 18+ or 20+ ([download](https://nodejs.org/))
- **npm**: Version 9+ (comes with Node.js)
- **Git**: For version control
- **Modern Browser**: Chrome 90+, Firefox 88+, or Safari 14+
- **Code Editor**: VS Code recommended with Vue extensions

## Initial Setup

### 1. Create Vue 3 Project with Vite

```bash
# Create new Vite + Vue 3 project
npm create vite@latest . -- --template vue

# Install dependencies
npm install

# Install additional dependencies
npm install chart.js vue-chartjs

# Install dev dependencies (if testing)
npm install -D vitest @vue/test-utils
```

### 2. Project Structure

Create the following directory structure:

```bash
mkdir -p src/components
mkdir -p src/composables
mkdir -p src/utils
mkdir -p tests/unit
mkdir -p public
```

Your final structure should match:

```
crash-game/
├── src/
│   ├── components/
│   │   ├── GameGraph.vue
│   │   ├── BettingPanel.vue
│   │   ├── GameHistory.vue
│   │   └── BalanceDisplay.vue
│   ├── composables/
│   │   ├── useGameEngine.js
│   │   ├── useBalance.js
│   │   └── useGameHistory.js
│   ├── utils/
│   │   ├── crashFormula.js
│   │   ├── randomGenerator.js
│   │   └── currency.js
│   ├── App.vue
│   └── main.js
├── tests/
│   └── unit/
│       ├── crashFormula.test.js
│       └── randomGenerator.test.js
├── public/
│   └── index.html
├── package.json
├── vite.config.js
└── README.md
```

### 3. Configure Vite (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
```

### 4. Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

## Development Workflow

### Running the Development Server

```bash
# Start dev server (hot reload enabled)
npm run dev

# Server will start at http://localhost:3000
# Browser should open automatically
```

### Building for Production

```bash
# Create optimized production build
npm run build

# Output will be in ./dist directory

# Preview production build locally
npm run preview
```

### Running Tests (Optional)

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test --run

# Run tests with UI
npm run test:ui
```

## Implementation Order (By User Story)

Follow the prioritized user stories from spec.md:

### Phase 1: User Story 1 - Watch Game Round (P1 - MVP)

**Goal**: Display a working game round with animated multiplier graph.

**Implementation Steps**:

1. **Create Core Utilities** (src/utils/):
   ```bash
   # Start with pure functions - no UI dependencies
   - crashFormula.js      # Implement M=0.97/(1-R)
   - randomGenerator.js   # Implement provably fair RNG
   - currency.js          # Formatting helpers
   ```

2. **Create Game Engine Composable** (src/composables/useGameEngine.js):
   ```bash
   # Manages round lifecycle, multiplier updates
   - Initialize game state
   - Implement round generation
   - Implement game loop with requestAnimationFrame
   - Handle state transitions (BETTING → RUNNING → CRASHED)
   ```

3. **Create Graph Component** (src/components/GameGraph.vue):
   ```bash
   # Visualizes multiplier curve in real-time
   - Set up Chart.js line chart
   - Connect to gameState.currentMultiplier
   - Update chart every frame
   - Show crash point when round ends
   ```

4. **Create App Shell** (src/App.vue):
   ```bash
   # Main application component
   - Import useGameEngine
   - Mount GameGraph component
   - Display current multiplier value
   - Show round state (BETTING/RUNNING/CRASHED)
   ```

5. **Test MVP**:
   ```bash
   npm run dev
   # You should see:
   # - Graph displaying multiplier starting at 1.00x
   # - Multiplier increasing over time
   # - Round crashing at random point
   # - New round starting after 5 second countdown
   ```

**Checkpoint**: At this point, you have a working MVP that can be demoed!

---

### Phase 2: User Story 2 - Place Bet and Cash Out (P2)

**Goal**: Add interactive betting mechanics.

**Implementation Steps**:

1. **Create Balance Composable** (src/composables/useBalance.js):
   ```bash
   - Initialize balance state ($1000 default)
   - Implement placeBet() method
   - Implement cashOut() method
   - Add localStorage persistence
   ```

2. **Create Balance Display Component** (src/components/BalanceDisplay.vue):
   ```bash
   - Show current balance formatted as currency
   - Animate on balance changes
   ```

3. **Create Betting Panel Component** (src/components/BettingPanel.vue):
   ```bash
   - During BETTING: show bet input field + "Place Bet" button
   - During RUNNING (with bet): show "Cash Out" button + potential winnings
   - During RUNNING (no bet): show "Round in progress"
   - During CRASHED: show results
   ```

4. **Update App.vue**:
   ```bash
   - Import useBalance composable
   - Add BalanceDisplay component
   - Add BettingPanel component
   - Wire up bet/cash-out events
   ```

5. **Test Betting Flow**:
   ```bash
   npm run dev
   # Test scenario:
   # 1. Enter bet amount ($10)
   # 2. Click "Place Bet"
   # 3. Balance decreases to $990
   # 4. Round starts, multiplier increases
   # 5. Click "Cash Out" at 2.5x
   # 6. Balance increases to $1015 ($990 + $25 winnings)
   ```

**Checkpoint**: Now you have a fully interactive betting game!

---

### Phase 3: User Story 3 - View Game History (P3)

**Goal**: Add transparency with game history display.

**Implementation Steps**:

1. **Create History Composable** (src/composables/useGameHistory.js):
   ```bash
   - Initialize history state (empty array)
   - Implement addRound() method
   - Implement getRecentRounds() method
   - Add localStorage persistence
   - Circular buffer logic (max 50 rounds)
   ```

2. **Update Game Engine**:
   ```bash
   - When round crashes, call history.addRound()
   - Pass round data (roundId, crashPoint, playerBet info)
   ```

3. **Create Game History Component** (src/components/GameHistory.vue):
   ```bash
   - Display list of recent rounds
   - Show: round number, crash point, timestamp
   - Show player result (win/loss) if they bet
   - Color code: green for wins, red for losses
   - Newest rounds at top
   ```

4. **Update App.vue**:
   ```bash
   - Import useGameHistory composable
   - Add GameHistory component to layout
   ```

5. **Test History**:
   ```bash
   npm run dev
   # Play several rounds, verify:
   # - History updates after each round
   # - Shows correct crash points
   # - Player results (if bet placed)
   # - History persists on page refresh
   ```

**Checkpoint**: Feature complete! All 3 user stories implemented.

---

## Key Code Snippets

### Crash Formula Implementation

```javascript
// src/utils/crashFormula.js

/**
 * Calculate crash point from random value
 * Formula: M = 0.97 / (1 - R) where R is random [0, 1)
 * @param {number} randomValue - Random value between 0 and 1
 * @returns {number} Crash point (minimum 1.00)
 */
export function calculateCrashPoint(randomValue) {
  if (randomValue <= 0 || randomValue >= 1) {
    throw new Error('Random value must be in range (0, 1)');
  }

  const crashPoint = 0.97 / (1 - randomValue);

  // Clamp to reasonable maximum (10000x)
  return Math.min(Math.max(crashPoint, 1.00), 10000);
}

/**
 * Calculate current multiplier based on elapsed time
 * @param {number} elapsedMs - Milliseconds since round started
 * @param {number} crashPoint - The target crash multiplier
 * @returns {number} Current multiplier (1.00 to crashPoint)
 */
export function calculateCurrentMultiplier(elapsedMs, crashPoint) {
  // Determine how long it takes to reach crash point
  // Let's use 1 second per 1.0x increase (adjustable)
  const msPerMultiplier = 1000;
  const timeTocrash = (crashPoint - 1.00) * msPerMultiplier;

  if (elapsedMs >= timeTocrash) {
    return crashPoint;
  }

  // Linear progression from 1.00 to crashPoint
  const progress = elapsedMs / timeTocrash;
  return 1.00 + (crashPoint - 1.00) * progress;
}
```

### Provably Fair RNG

```javascript
// src/utils/randomGenerator.js

/**
 * Generate cryptographically secure random value
 * @returns {number} Random value in range [0, 1)
 */
export function generateSecureRandom() {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}

/**
 * Generate a random seed string
 * @returns {string} Hex string seed
 */
export function generateSeed() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash seed using SHA-256 (for provable fairness)
 * @param {string} seed - Seed to hash
 * @returns {Promise<string>} SHA-256 hash as hex string
 */
export async function hashSeed(seed) {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Basic Game Engine Structure

```javascript
// src/composables/useGameEngine.js

import { reactive, ref, onUnmounted } from 'vue';
import { generateSeed, generateSecureRandom } from '@/utils/randomGenerator';
import { calculateCrashPoint, calculateCurrentMultiplier } from '@/utils/crashFormula';

export function useGameEngine() {
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
    countdown: 5
  });

  let animationId = null;
  let countdownInterval = null;

  function generateNewRound() {
    const seed = generateSeed();
    const randomValue = generateSecureRandom();
    const crashPoint = calculateCrashPoint(randomValue);

    gameState.currentRound = {
      roundId: gameState.currentRound.roundId + 1,
      seed,
      seedHash: '', // TODO: hash seed
      crashPoint,
      state: 'BETTING',
      startTime: 0,
      crashTime: null,
      currentMultiplier: 1.00,
      elapsedTime: 0
    };

    startCountdown();
  }

  function startCountdown() {
    gameState.countdown = 5;
    countdownInterval = setInterval(() => {
      gameState.countdown--;
      if (gameState.countdown <= 0) {
        clearInterval(countdownInterval);
        startRound();
      }
    }, 1000);
  }

  function startRound() {
    gameState.currentRound.state = 'RUNNING';
    gameState.currentRound.startTime = Date.now();
    gameState.isRunning = true;
    gameLoop();
  }

  function gameLoop() {
    const now = Date.now();
    const elapsedMs = now - gameState.currentRound.startTime;
    gameState.currentRound.elapsedTime = elapsedMs;

    const multiplier = calculateCurrentMultiplier(elapsedMs, gameState.currentRound.crashPoint);
    gameState.currentRound.currentMultiplier = multiplier;

    // Check if crashed
    if (multiplier >= gameState.currentRound.crashPoint) {
      crashRound();
      return;
    }

    animationId = requestAnimationFrame(gameLoop);
  }

  function crashRound() {
    gameState.currentRound.state = 'CRASHED';
    gameState.currentRound.crashTime = Date.now();
    gameState.isRunning = false;

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Start new round after 3 seconds
    setTimeout(() => {
      generateNewRound();
    }, 3000);
  }

  function init() {
    generateNewRound();
  }

  function cleanup() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
  }

  onUnmounted(cleanup);

  return {
    gameState,
    init,
    cleanup
  };
}
```

## Debugging Tips

### Common Issues and Solutions

1. **Graph not updating smoothly**:
   ```bash
   # Check browser console for errors
   # Ensure requestAnimationFrame is used, not setInterval
   # Verify chart.update() is called every frame
   ```

2. **Balance calculations incorrect**:
   ```bash
   # Always use integer math (cents, not dollars)
   # Use Math.floor() for winnings, never Math.round()
   # Log calculations: console.log(`Bet: ${bet}, Multiplier: ${mult}, Winnings: ${win}`)
   ```

3. **LocalStorage not persisting**:
   ```bash
   # Check browser console for quota errors
   # Verify JSON.stringify/parse doesn't throw
   # Test in incognito: localStorage may be disabled in some browsers
   # Use try/catch around all localStorage operations
   ```

4. **Game loop not starting**:
   ```bash
   # Verify init() is called in App.vue's onMounted
   # Check console for JavaScript errors
   # Verify state transitions: BETTING → RUNNING → CRASHED
   ```

5. **Crash points seem wrong**:
   ```bash
   # Verify formula: M = 0.97 / (1 - R)
   # Test with known R values:
   #   R=0.5 → M = 0.97/0.5 = 1.94
   #   R=0.9 → M = 0.97/0.1 = 9.70
   # Check random values are in range (0, 1)
   ```

### Browser DevTools

- **Vue DevTools**: Install extension to inspect component state
- **Performance Tab**: Profile game loop, ensure 60 FPS
- **Application Tab**: Inspect localStorage contents
- **Console**: Monitor errors, add debug logs

## Testing Checklist

Before considering a user story "done":

### User Story 1 (Watch Game):
- [ ] Round starts automatically
- [ ] Multiplier starts at 1.00x
- [ ] Graph displays smooth animation (no stuttering)
- [ ] Multiplier increases over time
- [ ] Round crashes at random point
- [ ] New round starts after countdown
- [ ] Works in Chrome, Firefox, Safari

### User Story 2 (Betting):
- [ ] Can place bet during BETTING phase
- [ ] Cannot bet during RUNNING phase
- [ ] Balance decreases when bet placed
- [ ] Can cash out during RUNNING phase
- [ ] Cannot cash out during BETTING/CRASHED
- [ ] Winnings calculated correctly (bet × multiplier)
- [ ] Balance increases on successful cash out
- [ ] Balance persists on page refresh
- [ ] Cannot bet more than available balance
- [ ] Cannot bet less than $1.00 or more than $1000.00

### User Story 3 (History):
- [ ] History updates after each round
- [ ] Shows correct crash points
- [ ] Shows player bet results (if applicable)
- [ ] Newest rounds appear at top
- [ ] Maximum 50 rounds stored
- [ ] History persists on page refresh
- [ ] Displays timestamps correctly

## Next Steps

After completing all user stories:

1. **Run `/speckit.tasks`** to generate detailed implementation tasks
2. **Run `/speckit.implement`** to execute tasks and build the feature
3. **Test thoroughly** on multiple browsers and devices
4. **Optimize** based on performance profiling
5. **Deploy** to production hosting (Vercel, Netlify, etc.)

## Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [LocalStorage Guide](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Bustabit Open Source](https://github.com/bustabit) (for reference)

## Support

For questions or issues:
1. Check this quickstart guide
2. Review spec.md for requirements
3. Review plan.md for technical context
4. Review data-model.md for data structures
5. Review contracts/game-state.md for API details
