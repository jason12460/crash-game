# Feature Specification: Crash Game

**Feature Branch**: `001-crash-game`
**Created**: 2025-10-23
**Status**: Draft
**Input**: User description: "做一個Bustabit like的遊戲，倍數公式為M=0.97/(1-R)，有座標空間顯示，X是時間，Y是倍率"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch Game Round and Visual Multiplier (Priority: P1)

As a player, I want to watch a live game round where a multiplier increases over time on a visual graph, so I can observe the game mechanics and decide when I might want to cash out in future rounds.

**Why this priority**: This is the core game mechanic and visual representation. Without this, there is no game to play. This provides the foundational experience that all other features build upon.

**Independent Test**: Can be fully tested by starting a game round and observing the multiplier increase from 1.00x upward on a coordinate graph display until the round crashes. Delivers the complete viewing experience without requiring betting functionality.

**Acceptance Scenarios**:

1. **Given** a game round is starting, **When** the round begins, **Then** the multiplier starts at 1.00x and increases over time following the formula M=0.97/(1-R)
2. **Given** a round is in progress, **When** time passes, **Then** the visual graph displays the current multiplier on the Y-axis and elapsed time on the X-axis
3. **Given** a round is in progress, **When** the random crash point is reached, **Then** the multiplier stops increasing and the round ends
4. **Given** a round has crashed, **When** viewing the graph, **Then** the final crash multiplier is clearly displayed
5. **Given** a round has ended, **When** a brief countdown completes, **Then** a new round automatically starts

---

### User Story 2 - Place Bet and Cash Out (Priority: P2)

As a player, I want to place a bet before a round starts and cash out during the round, so I can win money based on the multiplier at my cash-out point.

**Why this priority**: This adds the interactive gambling element to the game. Once players can watch the game (P1), they need the ability to participate with real stakes. This is the primary revenue-generating feature.

**Independent Test**: Can be tested by placing a bet amount before round start, watching the multiplier increase, clicking cash out at a chosen multiplier (e.g., 2.5x), and receiving winnings calculated as bet × multiplier. Delivers complete single-round gambling experience.

**Acceptance Scenarios**:

1. **Given** I am a player with available balance, **When** the betting phase begins, **Then** I can enter a bet amount and confirm my bet
2. **Given** I have placed a bet, **When** the round starts, **Then** my bet amount is deducted from my balance
3. **Given** I have an active bet in a running round, **When** I click the cash-out button, **Then** my winnings (bet × current multiplier) are added to my balance and I exit the round
4. **Given** I have an active bet, **When** the round crashes before I cash out, **Then** I lose my bet amount
5. **Given** the round has started, **When** I have not placed a bet, **Then** I can only watch and cannot cash out
6. **Given** I successfully cash out, **When** viewing my results, **Then** I see my bet amount, cash-out multiplier, and winnings clearly displayed

---

### User Story 3 - View Game History (Priority: P3)

As a player, I want to view the history of previous game rounds and their crash points, so I can analyze patterns and inform my betting strategy.

**Why this priority**: This enhances the player experience by providing transparency and data for strategy development. While not essential for core gameplay, it adds value for engaged players and builds trust.

**Independent Test**: Can be tested by playing several rounds, then viewing a history list showing the last 20+ rounds with their crash multipliers and timestamps. Delivers historical analysis capability independently.

**Acceptance Scenarios**:

1. **Given** multiple rounds have been played, **When** I view the game history, **Then** I see a list of the most recent rounds with their crash multipliers
2. **Given** I am viewing game history, **When** examining each entry, **Then** I can see the round number, crash multiplier, and timestamp
3. **Given** the history list is long, **When** scrolling through history, **Then** I can view at least the last 50 rounds
4. **Given** a new round completes, **When** the history updates, **Then** the newest round appears at the top of the history list

---

### Edge Cases

- What happens when the multiplier reaches extremely high values (e.g., 100x, 1000x)?
- How does the system handle network disconnection during an active bet?
- What happens if a player tries to cash out at the exact moment the game crashes?
- How does the system prevent timing manipulation or exploit attempts?
- What happens when a player's balance is insufficient for their desired bet?
- How are fractional bet amounts handled (e.g., can players bet $0.50 or only whole dollar amounts)?
- What happens if the random number generator produces edge-case values (R very close to 0 or 1)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate a random crash point for each round using a provably fair algorithm
- **FR-002**: System MUST calculate multiplier values using the formula M=0.97/(1-R) where R is a random value
- **FR-003**: System MUST display a coordinate graph with time on the X-axis and multiplier on the Y-axis
- **FR-004**: System MUST update the visual multiplier display in real-time as the round progresses (minimum 10 updates per second for smooth animation)
- **FR-005**: System MUST allow players to place bets during the betting phase before each round starts
- **FR-006**: System MUST prevent bet placement once a round has started
- **FR-007**: System MUST allow players with active bets to cash out at any time before the crash point
- **FR-008**: System MUST calculate winnings as bet amount × cash-out multiplier
- **FR-009**: System MUST handle the edge case where a player attempts to cash out at the exact crash moment by comparing server-side timestamps - cash-out succeeds if the request timestamp is before the crash timestamp
- **FR-010**: System MUST automatically start a new round after a countdown period when the previous round ends
- **FR-011**: System MUST display player's current balance at all times
- **FR-012**: System MUST maintain a history of at least the last 50 game rounds with their crash multipliers
- **FR-013**: System MUST validate that bet amounts do not exceed player's available balance
- **FR-014**: System MUST ensure crash point determination is provably fair and verifiable
- **FR-015**: Betting amounts MUST support a minimum bet of $1.00, maximum bet of $1000.00, with 2 decimal place precision (cents)

### Key Entities

- **Game Round**: Represents a single game instance with a unique round number, start time, crash point, crash multiplier, and round state (betting/running/crashed)
- **Player Bet**: Represents a player's wager in a specific round, including bet amount, player identifier, cash-out multiplier (if cashed out), cash-out time, and bet status (active/cashed-out/lost)
- **Player Balance**: Tracks each player's available funds, pending bets, and transaction history
- **Game History**: Chronological record of completed rounds with their outcomes
- **Multiplier Curve**: Time-series data points showing multiplier progression during a round for graph visualization

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Graph displays multiplier updates at least 10 times per second for smooth visual progression
- **SC-002**: New rounds start within 5 seconds after the previous round crashes
- **SC-003**: Players can complete the entire flow (place bet → watch multiplier → cash out → see winnings) in under 30 seconds for a typical round
- **SC-004**: Game history displays within 1 second of being requested
- **SC-005**: System accurately calculates winnings within 0.01 currency unit precision
- **SC-006**: 95% of cash-out requests are processed within 200 milliseconds to ensure fairness
- **SC-007**: Multiplier formula produces values that match M=0.97/(1-R) within 0.001 precision
- **SC-008**: System supports at least 100 concurrent players viewing/playing the same round simultaneously without visual degradation

## Assumptions

- Players access the game through a web browser or mobile app interface
- Currency handling uses standard decimal precision (2 decimal places for most currencies)
- Game rounds run continuously 24/7 without scheduled downtime
- The random value R is generated using a cryptographically secure random number generator
- Player authentication and account creation are handled by separate systems (out of scope for this feature)
- Network latency is assumed to be under 200ms for 95% of players
- Visual graph rendering uses standard web graphics capabilities (HTML5 Canvas, SVG, or similar)
- Anti-cheat and fraud detection systems are separate concerns (out of scope)
- Payment processing and withdrawal systems are separate (out of scope)
- Players understand basic gambling concepts and crash game mechanics

## Out of Scope

- Player registration and authentication system
- Payment deposit and withdrawal functionality
- Chat or social features between players
- Leaderboards or achievement systems
- Auto-bet or automated betting strategies
- Mobile-specific native app features (responsive web is sufficient)
- Multi-currency support (single currency assumed)
- Responsible gambling features (spending limits, self-exclusion)
- Admin panel for game configuration
- Advanced analytics or player behavior tracking beyond basic history
