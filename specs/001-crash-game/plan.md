# Implementation Plan: Crash Game

**Branch**: `001-crash-game` | **Date**: 2025-10-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-crash-game/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a Bustabit-style crash gambling game as a pure frontend Vue 3 application. The game features a real-time multiplier visualization on a coordinate graph (X=time, Y=multiplier) using the formula M=0.97/(1-R), player betting with cash-out mechanics, and game history tracking. All game logic runs client-side with local storage for player balance and history persistence.

## Technical Context

**Language/Version**: JavaScript ES2020+ / Vue 3.4+ (Composition API)
**Primary Dependencies**: Vue 3, Vite, Chart.js (or similar for graph visualization)
**Storage**: LocalStorage for player balance and game history persistence
**Testing**: Vitest (if testing deemed valuable for game logic)
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+)
**Project Type**: Single-page web application (frontend-only)
**Performance Goals**: 60 FPS graph animation, <16ms frame time for smooth multiplier updates
**Constraints**: No backend/server - all game logic client-side, offline-capable after initial load
**Scale/Scope**: Single-player experience, 50+ game history records in localStorage, responsive design for desktop/mobile

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Simplicity First ✅

- **Status**: PASS
- **Justification**: Pure frontend approach is the simplest possible implementation - no server setup, no API layer, no database. Vue 3 Composition API with minimal dependencies. Game logic implemented in plain JavaScript functions.

### II. Incremental Delivery ✅

- **Status**: PASS
- **Justification**: Feature spec already defines 3 independent user stories (P1: Watch game, P2: Betting, P3: History). Each can be developed and demonstrated independently.

### III. Clear Documentation ✅

- **Status**: PASS
- **Justification**: Spec.md completed with user scenarios. This plan.md will include data models, quickstart guide will provide setup instructions.

### IV. Test When Valuable ⚠️

- **Status**: CONDITIONAL
- **Decision**: Unit tests for multiplier formula calculation and crash point generation (high-risk game logic). No tests for UI components or simple state management.
- **Rationale**: Provably fair algorithm and mathematical accuracy are critical to player trust. Simple Vue components don't justify test overhead.

### V. Practical Technology Choices ✅

- **Status**: PASS
- **Justification**: Vue 3 is mature, well-documented, widely adopted. Chart.js is battle-tested for graph visualization. LocalStorage is native browser API. All choices are "boring" proven tech.

**Overall Gate Status**: ✅ PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-crash-game/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── game-state.md    # Client-side state contracts (no API)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── GameGraph.vue       # Chart display for multiplier curve
│   ├── BettingPanel.vue    # Bet input and cash-out controls
│   ├── GameHistory.vue     # List of past rounds
│   └── BalanceDisplay.vue  # Current player balance
├── composables/
│   ├── useGameEngine.js    # Core game loop and multiplier calculation
│   ├── useBalance.js       # Player balance management
│   └── useGameHistory.js   # History persistence and retrieval
├── utils/
│   ├── crashFormula.js     # M=0.97/(1-R) implementation
│   ├── randomGenerator.js  # Provably fair RNG
│   └── currency.js         # Decimal precision helpers
├── App.vue                 # Main application component
└── main.js                 # Vue app initialization

public/
└── index.html

tests/ (optional - only if valuable)
└── unit/
    ├── crashFormula.test.js
    └── randomGenerator.test.js
```

**Structure Decision**: Using Vue 3 single-page application structure. All game logic lives in `composables/` following Vue Composition API patterns. UI components are presentational and consume composables. Utilities provide pure functions for calculations. No backend/api directories needed since this is frontend-only.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution checks pass.

## Post-Design Constitution Re-Check

*Re-evaluation after Phase 1 (Design & Contracts) completion*

### I. Simplicity First ✅

- **Status**: PASS
- **Validation**: Design maintains simplicity. Pure functions in utils/, composables for state, presentational components. No unnecessary abstractions added. Chart.js is the only significant dependency. LocalStorage is simple native API.

### II. Incremental Delivery ✅

- **Status**: PASS
- **Validation**: Design supports independent user story implementation:
  - P1 (Watch Game): Can build and demo with just useGameEngine + GameGraph
  - P2 (Betting): Adds useBalance + BettingPanel without modifying P1 code
  - P3 (History): Adds useGameHistory + GameHistory as separate concern

### III. Clear Documentation ✅

- **Status**: PASS
- **Validation**: All artifacts generated:
  - ✅ plan.md (this file) - complete
  - ✅ research.md - technical decisions documented
  - ✅ data-model.md - entities and state structures defined
  - ✅ contracts/game-state.md - composable APIs documented
  - ✅ quickstart.md - developer setup guide complete

### IV. Test When Valuable ✅

- **Status**: PASS
- **Validation**: Testing strategy documented for high-value areas only:
  - crashFormula.js - critical game logic (provable fairness)
  - randomGenerator.js - security-sensitive RNG
  - No tests planned for UI components (low value, high maintenance)

### V. Practical Technology Choices ✅

- **Status**: PASS
- **Validation**: All technology choices are proven and well-documented:
  - Vue 3: Mature framework (3+ years)
  - Vite: Industry standard build tool
  - Chart.js: 10+ years in production
  - Native Web Crypto: Standard browser API
  - LocalStorage: 10+ years browser support

**Final Gate Status**: ✅ PASS - Design maintains constitutional compliance. Ready to proceed to task generation (/speckit.tasks).

## Planning Complete

**Artifacts Generated**:

1. ✅ plan.md - This file (implementation plan)
2. ✅ research.md - Technical research and decisions
3. ✅ data-model.md - Data entities and state structures
4. ✅ contracts/game-state.md - Composable and component contracts
5. ✅ quickstart.md - Development setup guide
6. ✅ CLAUDE.md - Agent context file updated

**Next Command**: `/speckit.tasks` - Generate executable task list organized by user story
