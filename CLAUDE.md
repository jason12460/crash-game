# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Bustabit-style crash gambling game built with Vue 3 and Vite. The game features real-time multiplier visualization, provably fair RNG, and interactive betting mechanics.

## Commands

### Development
```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build
```

### Testing
```bash
npm test            # Run tests in watch mode (Vitest)
npm test -- --run   # Run tests once
```

### Deployment
```bash
npm run deploy      # Build and deploy to GitHub Pages
```

## Architecture

### Core Game Loop (useGameEngine.js)
The game engine manages three states in a continuous cycle:
- **BETTING**: 5-second countdown before round starts
- **RUNNING**: Multiplier increases from 1.00x until crash point
- **CRASHED**: Round ends, reveals crash point and seed

The engine uses `requestAnimationFrame` for 60 FPS updates and calculates multiplier progression using a configurable curve formula.

### Provably Fair System
- **Seed Generation**: Uses Web Crypto API (`crypto.getRandomValues()`)
- **Pre-commitment**: SHA-256 hash shown before round starts
- **Verification**: Players can verify crash point matches revealed seed using `seedToRandom()` in utils/randomGenerator.js
- **Crash Formula**: `M = houseEdge / (1 - R)` where R is derived from seed

### State Management Pattern
Uses Vue 3 Composition API with composables for shared state:
- `useGameEngine()`: Game loop, multiplier, crash logic
- `useBalance()`: Balance tracking, bet placement, winnings
- `useGameHistory()`: Round history (last 50 rounds)
- `useRTPConfig()`: Configurable Return-to-Player settings
- `useDebugMode()`: Debug crash point override for testing

### Graph Rendering
Uses **uPlot** (not Chart.js) for high-performance real-time graphing at 60 FPS. Graph data is accumulated during RUNNING state and reset on new rounds.

### Data Persistence
LocalStorage keys:
- `crashgame_balance`: Player balance in cents
- `crashgame_history`: Last 50 game rounds
- `crashgame_engine`: Last round ID for continuity
- `crashgame_rtp`: RTP configuration (house edge, max multiplier)

## Project Structure

```
src/
├── App.vue                      # Main app, orchestrates all components
├── components/
│   ├── GameGraph.vue            # Real-time uPlot chart
│   ├── BettingPanel.vue         # Bet input, cash-out button
│   ├── BalanceDisplay.vue       # Current balance widget
│   ├── GameHistory.vue          # Past rounds table
│   ├── FairnessVerifier.vue     # Manual seed verification tool
│   ├── DebugPanel.vue           # Override crash point for testing
│   ├── RTPSettings.vue          # Configure house edge
│   └── RTPSimulator.vue         # Statistical simulation tool
├── composables/
│   ├── useGameEngine.js         # Core game loop and state machine
│   ├── useBalance.js            # Balance, betting, cash-out logic
│   ├── useGameHistory.js        # History persistence
│   ├── useRTPConfig.js          # RTP settings management
│   ├── useRTPSimulator.js       # Simulation utilities
│   └── useDebugMode.js          # Debug crash point override
├── utils/
│   ├── crashFormula.js          # Crash point and multiplier calculations
│   ├── randomGenerator.js       # Provably fair seed generation and hashing
│   └── currency.js              # Money formatting (cents to dollars)
└── main.js                      # Vue app initialization
```

## Key Technical Details

### Vite Configuration
- **Base path**: `/crash-game/` (for GitHub Pages deployment)
- **Path alias**: `@` maps to `src/`
- **Dev server**: Port 3000, COOP/COEP headers enabled
- **Test environment**: jsdom with globals enabled

### Multiplier Calculation
The multiplier progression uses a configurable curve:
```javascript
// In useGameEngine.js
const progress = elapsedTime / totalDuration;
const curvedProgress = Math.pow(progress, CURVE_EXPONENT);
const multiplier = 1.0 + (crashPoint - 1.0) * curvedProgress * BASE_SPEED_RATIO;
```
Current values: `CURVE_EXPONENT = 3`, `BASE_SPEED_RATIO = 0.3`

### Event System
The game engine emits events that components can listen to:
- `roundStart`: Fired when RUNNING state begins
- `roundCrash`: Fired when round transitions to CRASHED
- `multiplierUpdate`: Fired every frame during RUNNING

Subscribe via `gameEngine.on('eventName', callback)` in components.

## Testing

Tests are located in `tests/unit/` and use Vitest + @vue/test-utils.

Current test coverage:
- `crashFormula.test.js`: Crash point calculation validation
- `randomGenerator.test.js`: Seed generation, hashing, and conversion

When adding features, write unit tests for:
- All utility functions in `src/utils/`
- Composable state mutations
- Critical game logic (crash detection, cash-out timing)

## Browser Requirements

- Chrome 90+, Firefox 88+, Safari 14+
- Requires Web Crypto API for provably fair RNG
- LocalStorage for data persistence

## Notes

- All monetary values are stored as **cents** (integers) to avoid floating-point errors
- The game uses `requestAnimationFrame` for smooth 60 FPS updates
- Graph rendering is decoupled from game logic—it subscribes to multiplier updates
- RTP settings allow customization of house edge (0.97 default) and max crash point
