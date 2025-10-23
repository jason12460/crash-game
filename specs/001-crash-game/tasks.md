# Tasks: Crash Game

**Input**: Design documents from `/specs/001-crash-game/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/game-state.md

**Tests**: Tests are included for critical game logic only (multiplier formula and RNG), as specified in plan.md constitution check.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single-page Vue 3 application structure:
- Source: `src/` at repository root
- Tests: `tests/` at repository root
- Build output: `dist/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create Vue 3 project with Vite using npm create vite@latest
- [X] T002 Install core dependencies: chart.js, vue-chartjs
- [X] T003 [P] Install dev dependencies for testing: vitest, @vue/test-utils
- [X] T004 [P] Configure Vite in vite.config.js with test environment settings
- [X] T005 [P] Update package.json scripts for dev, build, preview, test
- [X] T006 Create directory structure: src/components/, src/composables/, src/utils/, tests/unit/
- [X] T007 [P] Create placeholder index.html in public/ directory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and functions that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 [P] Implement crash formula calculation in src/utils/crashFormula.js (calculateCrashPoint and calculateCurrentMultiplier)
- [X] T009 [P] Implement provably fair RNG in src/utils/randomGenerator.js (generateSecureRandom, generateSeed, hashSeed)
- [X] T010 [P] Implement currency formatting helpers in src/utils/currency.js (formatCurrency, calculateWinnings)
- [X] T011 [P] Write unit test for crash formula in tests/unit/crashFormula.test.js
- [X] T012 [P] Write unit test for random generator in tests/unit/randomGenerator.test.js
- [X] T013 Run tests to verify foundational utilities work correctly

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Watch Game Round and Visual Multiplier (Priority: P1) MVP

**Goal**: Display a working game round with animated multiplier graph showing real-time progression from 1.00x until crash

**Independent Test**: Start the dev server, observe a game round automatically starting with a 5-second countdown, multiplier increasing from 1.00x on a coordinate graph (X=time, Y=multiplier), round crashing at a random point, and a new round starting after countdown. This delivers the complete viewing experience without requiring betting functionality.

### Implementation for User Story 1

- [X] T014 [US1] Create useGameEngine composable in src/composables/useGameEngine.js with reactive state (currentRound, isRunning, countdown)
- [X] T015 [US1] Implement generateNewRound() method in useGameEngine.js using crashFormula and randomGenerator utilities
- [X] T016 [US1] Implement game loop with requestAnimationFrame in useGameEngine.js to update currentMultiplier
- [X] T017 [US1] Implement state transitions (BETTING → RUNNING → CRASHED) in useGameEngine.js
- [X] T018 [US1] Implement countdown logic and auto-start round functionality in useGameEngine.js
- [X] T019 [P] [US1] Create GameGraph component in src/components/GameGraph.vue with Chart.js line chart setup
- [X] T020 [US1] Connect GameGraph to useGameEngine currentMultiplier with reactive updates
- [X] T021 [US1] Implement real-time chart updates (60 FPS) in GameGraph.vue
- [X] T022 [US1] Display crash point marker on graph when round ends in GameGraph.vue
- [X] T023 [US1] Create main App.vue importing useGameEngine and mounting GameGraph
- [X] T024 [US1] Display current multiplier value and round state in App.vue
- [X] T025 [US1] Initialize game engine in App.vue onMounted lifecycle hook
- [X] T026 [US1] Add cleanup logic in App.vue onUnmounted to stop game loop

**Checkpoint**: At this point, User Story 1 should be fully functional - you can watch game rounds with animated multiplier graphs!

---

## Phase 4: User Story 2 - Place Bet and Cash Out (Priority: P2)

**Goal**: Add interactive betting mechanics allowing players to place bets before rounds start and cash out during rounds to win based on the current multiplier

**Independent Test**: Enter a bet amount (e.g., $10) during the betting phase, click "Place Bet", observe balance decrease to $990, watch multiplier increase during the round, click "Cash Out" at 2.5x, and verify balance increases to $1015 ($990 + $25 winnings). This delivers complete single-round gambling experience independently of history tracking.

### Implementation for User Story 2

- [X] T027 [US2] Create useBalance composable in src/composables/useBalance.js with reactive state (balanceCents, currentBet, transactions)
- [X] T028 [US2] Implement placeBet() method with validation in useBalance.js
- [X] T029 [US2] Implement cashOut() method with winnings calculation in useBalance.js
- [X] T030 [US2] Implement canPlaceBet() and canCashOut() validation methods in useBalance.js
- [X] T031 [US2] Add localStorage persistence (loadBalance, saveBalance) in useBalance.js
- [X] T032 [US2] Implement transaction recording (BET, WIN, LOSS types) in useBalance.js
- [X] T033 [P] [US2] Create BalanceDisplay component in src/components/BalanceDisplay.vue showing formatted currency
- [X] T034 [P] [US2] Create BettingPanel component in src/components/BettingPanel.vue with bet input and place bet button
- [X] T035 [US2] Implement betting phase UI (bet input, validation) in BettingPanel.vue
- [X] T036 [US2] Implement running phase UI (cash out button, potential winnings) in BettingPanel.vue
- [X] T037 [US2] Implement crashed phase UI (results display, countdown) in BettingPanel.vue
- [X] T038 [US2] Connect BettingPanel to useBalance and useGameEngine with event handlers
- [X] T039 [US2] Update App.vue to import useBalance and add BalanceDisplay and BettingPanel components
- [X] T040 [US2] Wire up bet and cash-out event handlers in App.vue
- [X] T041 [US2] Implement automatic bet loss handling when round crashes in useGameEngine integration with useBalance
- [X] T042 [US2] Add balance change animations and notifications in UI components

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - you can watch games AND place bets with cash-outs!

---

## Phase 5: User Story 3 - View Game History (Priority: P3)

**Goal**: Add transparency with game history display showing previous round results and player performance

**Independent Test**: Play several game rounds (with or without bets), then view the game history panel showing the last 20+ rounds with their crash multipliers, timestamps, and player results (wins/losses color-coded). Verify history persists on page refresh. This delivers historical analysis capability independently of other features.

### Implementation for User Story 3

- [X] T043 [US3] Create useGameHistory composable in src/composables/useGameHistory.js with reactive state (rounds array, maxRecords)
- [X] T044 [US3] Implement addRound() method with circular buffer logic (max 50 rounds) in useGameHistory.js
- [X] T045 [US3] Implement getRecentRounds() method in useGameHistory.js
- [X] T046 [US3] Add localStorage persistence (loadHistory, saveHistory) in useGameHistory.js
- [X] T047 [US3] Implement clearHistory() method for admin/debug purposes in useGameHistory.js
- [X] T048 [P] [US3] Create GameHistory component in src/components/GameHistory.vue with scrollable list UI
- [X] T049 [US3] Display round data (roundId, crashPoint, timestamp) in GameHistory.vue
- [X] T050 [US3] Display player bet results with color coding (green=win, red=loss, gray=no bet) in GameHistory.vue
- [X] T051 [US3] Implement newest-first ordering in GameHistory.vue
- [X] T052 [US3] Update useGameEngine to call useGameHistory.addRound() when rounds crash
- [X] T053 [US3] Pass player bet data from useBalance to history when round completes
- [X] T054 [US3] Update App.vue to import useGameHistory and add GameHistory component to layout
- [X] T055 [US3] Verify history updates in real-time as rounds complete
- [X] T056 [US3] Test history persistence across page refreshes

**Checkpoint**: All user stories should now be independently functional - complete game with betting and history!

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T057 [P] Add responsive CSS layout (mobile-first with Grid/Flexbox) in App.vue and components
- [X] T058 [P] Add error handling and user-friendly error messages for all operations
- [X] T059 [P] Implement error handling for localStorage quota exceeded (trim history to 10 records)
- [X] T060 [P] Add error handling for localStorage disabled (show user message)
- [X] T061 [P] Add provably fair verification UI showing seed hash before round and seed reveal after
- [X] T062 [P] Add loading states and transitions for better UX
- [X] T063 [P] Optimize Chart.js performance (disable animations, limit data points to 200)
- [X] T064 [P] Add keyboard shortcuts (spacebar to cash out, enter to place bet)
- [X] T065 [P] Add accessibility improvements (ARIA labels, keyboard navigation)
- [X] T066 Test on multiple browsers (Chrome, Firefox, Safari) and devices (desktop, mobile)
- [X] T067 Run performance profiling to ensure 60 FPS graph updates and <200ms cash-out response
- [X] T068 Validate all acceptance scenarios from spec.md user stories
- [X] T069 Build production bundle and verify bundle size is acceptable
- [X] T070 Run quickstart.md validation to ensure setup instructions are accurate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but is independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Integrates with US1/US2 but is independently testable

### Within Each User Story

- Composables before components that use them
- Core implementation before integration with other stories
- Story complete and tested before moving to next priority

### Parallel Opportunities

**Setup Phase:**
- T003, T004, T005, T007 can run in parallel after T001-T002 complete

**Foundational Phase:**
- T008, T009, T010 can run in parallel (different utility files)
- T011, T012 can run in parallel (different test files)

**User Story 1:**
- T019 (GameGraph component) can be started in parallel with T014-T018 (useGameEngine implementation)

**User Story 2:**
- T033 (BalanceDisplay) and T034 (BettingPanel) can run in parallel after T027-T032 (useBalance) complete

**User Story 3:**
- T048 (GameHistory component) can be started in parallel with T043-T047 (useGameHistory implementation)

**Polish Phase:**
- T057, T058, T059, T060, T061, T062, T063, T064, T065 can all run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all utility implementations in parallel:
Task: "Implement crash formula in src/utils/crashFormula.js"
Task: "Implement provably fair RNG in src/utils/randomGenerator.js"
Task: "Implement currency helpers in src/utils/currency.js"

# After utilities complete, launch tests in parallel:
Task: "Write unit test for crash formula in tests/unit/crashFormula.test.js"
Task: "Write unit test for random generator in tests/unit/randomGenerator.test.js"
```

---

## Parallel Example: User Story 1

```bash
# Start composable and component work in parallel:
Task: "Create useGameEngine composable with state in src/composables/useGameEngine.js"
Task: "Create GameGraph component skeleton in src/components/GameGraph.vue"

# After composable logic is complete, wire up to component and app
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T013) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T014-T026)
4. **STOP and VALIDATE**: Test User Story 1 independently by running dev server
5. Deploy/demo if ready - you now have a working crash game visualization!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (13 tasks)
2. Add User Story 1 → Test independently → Deploy/Demo (13 more tasks = 26 total) - **MVP!**
3. Add User Story 2 → Test independently → Deploy/Demo (16 more tasks = 42 total)
4. Add User Story 3 → Test independently → Deploy/Demo (14 more tasks = 56 total)
5. Polish → Final production-ready version (14 more tasks = 70 total)

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T013)
2. Once Foundational is done:
   - Developer A: User Story 1 (T014-T026)
   - Developer B: User Story 2 (T027-T042)
   - Developer C: User Story 3 (T043-T056)
3. Stories complete and integrate independently
4. Team collaborates on Polish phase (T057-T070)

---

## Task Count Summary

- **Phase 1 (Setup)**: 7 tasks
- **Phase 2 (Foundational)**: 6 tasks (BLOCKING)
- **Phase 3 (User Story 1 - P1)**: 13 tasks - **MVP Scope**
- **Phase 4 (User Story 2 - P2)**: 16 tasks
- **Phase 5 (User Story 3 - P3)**: 14 tasks
- **Phase 6 (Polish)**: 14 tasks
- **Total**: 70 tasks

**MVP Task Count**: 26 tasks (Setup + Foundational + User Story 1)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are only included for critical game logic (crash formula, RNG) per constitution
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Success Validation Criteria

After completing all tasks, verify:

### User Story 1 (Watch Game):
- [ ] Round starts automatically after countdown
- [ ] Multiplier starts at 1.00x and increases smoothly
- [ ] Graph displays at 60 FPS without stuttering
- [ ] Round crashes at random point following M=0.97/(1-R)
- [ ] New round starts after 5-second countdown
- [ ] Works in Chrome 90+, Firefox 88+, Safari 14+

### User Story 2 (Betting):
- [ ] Can place bet during BETTING phase only
- [ ] Balance decreases correctly when bet placed
- [ ] Can cash out during RUNNING phase only
- [ ] Winnings calculated as floor(bet × multiplier)
- [ ] Balance increases on successful cash out
- [ ] Balance persists on page refresh
- [ ] Cannot bet more than balance or outside $1-$1000 range
- [ ] Bet lost if round crashes before cash out

### User Story 3 (History):
- [ ] History updates after each round
- [ ] Shows correct crash points and timestamps
- [ ] Shows player bet results (win/loss) if applicable
- [ ] Newest rounds appear at top
- [ ] Maximum 50 rounds stored (circular buffer)
- [ ] History persists on page refresh

### Performance Targets:
- [ ] Graph updates at 60 FPS (16ms frame time)
- [ ] Cash-out responds in <200ms
- [ ] History loads in <1 second
- [ ] Bundle size <500KB gzipped
