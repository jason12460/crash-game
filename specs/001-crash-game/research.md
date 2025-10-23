# Research: Crash Game Technical Decisions

**Feature**: Crash Game (001-crash-game)
**Date**: 2025-10-23
**Purpose**: Document research findings and technical decisions for pure frontend Vue 3 implementation

## Research Topics

### 1. Graph Visualization Library Selection

**Decision**: Chart.js v4 with Vue-ChartJS wrapper

**Rationale**:
- **Lightweight**: ~150KB minified, acceptable for browser application
- **Real-time updates**: Built-in support for live data streaming via `update()` method
- **Performance**: Hardware-accelerated canvas rendering, can handle 60 FPS updates
- **Vue integration**: Official vue-chartjs wrapper provides reactive chart components
- **Simplicity**: Simple API for line charts, no complex configuration needed
- **Proven**: Used by millions of websites, extensive documentation and examples

**Alternatives Considered**:
- **D3.js**: Too complex for simple line chart, steeper learning curve, larger bundle size
- **ApexCharts**: Good alternative but heavier (~500KB), more features than needed
- **Native Canvas API**: Would require writing chart logic from scratch, violates simplicity principle
- **SVG + Vue**: Possible but manual axis/scaling/animation logic adds unnecessary complexity

**Best Practices for Real-time Charts**:
- Use `requestAnimationFrame` for smooth 60 FPS updates
- Limit data points on canvas (keep last 100-200 points, remove old ones)
- Use Chart.js `decimation` plugin to reduce rendering load
- Disable animations for real-time data updates (set `animation: false`)
- Update chart data via reactive refs in Vue Composition API

### 2. Provably Fair Random Number Generation

**Decision**: Crypto.getRandomValues() with SHA-256 hashing for verifiability

**Rationale**:
- **Browser native**: `window.crypto.getRandomValues()` is cryptographically secure PRNG
- **No dependencies**: Built into all modern browsers, no external library needed
- **Verifiable**: Can generate seed hash before round, reveal seed after to prove fairness
- **Standard approach**: Same method used by established crash games (Bustabit pattern)

**Implementation Pattern**:
```javascript
// Generate crash point from random seed
function generateCrashPoint(seed) {
  const hash = sha256(seed);
  const randomValue = parseInt(hash.slice(0, 13), 16) / Math.pow(2, 52);
  return Math.max(1.00, 0.97 / randomValue);
}
```

**Alternatives Considered**:
- **Math.random()**: Not cryptographically secure, players can't verify fairness
- **External RNG service**: Requires backend, violates pure frontend requirement
- **Blockchain-based**: Overkill for single-player game, adds complexity and cost

**Best Practices for Provably Fair**:
- Generate server seed (or in this case, client seed) before round starts
- Hash seed and show hash to player before round begins
- After round ends, reveal actual seed so players can verify the hash matches
- Store seed/hash history for audit trail
- Document verification algorithm clearly for transparency

### 3. State Management Approach

**Decision**: Vue 3 Composition API with composables (no Pinia/Vuex)

**Rationale**:
- **Simplicity**: Game state is simple enough for composables, no need for centralized store
- **Composition API**: Provides reactive state and lifecycle hooks without extra dependency
- **Colocation**: Each domain (game engine, balance, history) gets its own composable
- **Testing**: Composables are plain JavaScript functions, easy to unit test if needed
- **Performance**: Direct reactive refs are faster than store abstraction layer

**State Organization**:
- `useGameEngine`: Game round state, multiplier calculation, crash logic
- `useBalance`: Player balance, bet tracking, winnings calculation
- `useGameHistory`: History persistence to localStorage, retrieval

**Alternatives Considered**:
- **Pinia**: Good choice for larger apps, but overkill for this simple game state
- **Vuex**: Legacy option, more boilerplate than Composition API approach
- **Global reactive object**: Possible but composables provide better encapsulation

**Best Practices for Composables**:
- Return only necessary reactive refs and methods (explicit API)
- Use `readonly()` for values that shouldn't be mutated by consumers
- Handle side effects (localStorage, timers) in composable, not components
- Keep composables focused on single responsibility

### 4. LocalStorage Data Persistence

**Decision**: JSON serialization with versioning for balance and history

**Rationale**:
- **Native API**: No dependencies, supported by all browsers
- **Sufficient capacity**: 5-10MB limit enough for 50+ game records and balance
- **Synchronous**: Immediate read/write, no async complexity
- **Simple schema**: JSON serialization works well for our simple data structures

**Storage Schema**:
```javascript
{
  version: '1.0',
  balance: 1000.00,
  history: [
    { roundId: 1, crashPoint: 2.45, timestamp: '2025-10-23T...', ... },
    // ... up to 50 most recent rounds
  ]
}
```

**Alternatives Considered**:
- **IndexedDB**: Async API adds complexity, overkill for small dataset
- **SessionStorage**: Data lost on tab close, not suitable for persistent balance
- **Cookies**: Size limitations, not designed for structured data storage
- **In-memory only**: Balance/history lost on page refresh, bad UX

**Best Practices for LocalStorage**:
- Wrap in try/catch (localStorage can throw if quota exceeded or disabled)
- Add version field for future schema migrations
- Implement circular buffer for history (keep last N items, auto-delete old)
- Parse with fallback to default state if corrupted/missing
- Consider compression if data grows large (not needed for this scope)

### 5. Game Loop Implementation

**Decision**: requestAnimationFrame with fixed timestep for multiplier calculation

**Rationale**:
- **Smooth animation**: rAF syncs with browser's 60 FPS refresh rate
- **Performance**: Browser automatically throttles when tab inactive (saves CPU)
- **Accuracy**: Fixed timestep ensures multiplier formula calculates consistently
- **Standard pattern**: Used by all modern browser games

**Implementation Pattern**:
```javascript
let lastTime = 0;
const TICK_RATE = 1000 / 60; // 60 FPS

function gameLoop(currentTime) {
  const deltaTime = currentTime - lastTime;

  if (deltaTime >= TICK_RATE) {
    updateMultiplier(deltaTime);
    updateChart();
    lastTime = currentTime;
  }

  if (gameState.running) {
    animationId = requestAnimationFrame(gameLoop);
  }
}
```

**Alternatives Considered**:
- **setInterval**: Inconsistent timing, doesn't sync with browser refresh
- **setTimeout recursive**: Better than setInterval but still less accurate than rAF
- **Web Workers**: Overkill for this simple calculation, adds complexity

**Best Practices for Game Loops**:
- Always store animationId and call `cancelAnimationFrame` on cleanup
- Use fixed timestep for game logic, variable timestep for rendering
- Guard against spiral of death (if frame takes too long, clamp deltaTime)
- Clean up loop in Vue `onUnmounted` lifecycle hook

### 6. Decimal Precision for Currency

**Decision**: Store as cents (integers), display as dollars with 2 decimal formatting

**Rationale**:
- **Avoid floating-point errors**: JavaScript floats are imprecise (0.1 + 0.2 !== 0.3)
- **Accurate calculations**: Integer math is exact, no rounding errors
- **Standard practice**: How financial applications handle money
- **Simple conversion**: Multiply by 100 to store, divide by 100 to display

**Implementation**:
```javascript
// Store balance as cents (integer)
const balanceCents = ref(100000); // $1000.00

// Display helper
function formatCurrency(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Calculation helper
function calculateWinnings(betCents, multiplier) {
  return Math.floor(betCents * multiplier); // Always round down
}
```

**Alternatives Considered**:
- **Native floats**: Causes precision errors in financial calculations
- **Decimal.js library**: Adds dependency, overkill for simple 2-decimal currency
- **BigInt**: Possible but requires more manual conversion logic

**Best Practices**:
- Always round down winnings (Math.floor) to avoid giving away fractional cents
- Validate bet amounts are integers (cents) before processing
- Format display using `.toFixed(2)` for consistent 2-decimal places
- Add min/max validation based on spec (100 cents min, 100000 cents max)

### 7. Responsive Design Strategy

**Decision**: CSS Grid + Flexbox with mobile-first breakpoints

**Rationale**:
- **Native CSS**: No framework needed, modern browser support excellent
- **Flexible layouts**: Grid for overall structure, Flexbox for component internals
- **Performance**: No JavaScript layout calculations, pure CSS is fastest
- **Mobile-first**: Start with mobile design, progressively enhance for desktop

**Breakpoints**:
- Mobile: < 768px (single column, stacked layout)
- Tablet: 768px - 1024px (adjust spacing, larger touch targets)
- Desktop: > 1024px (side-by-side layout for graph + controls)

**Alternatives Considered**:
- **Tailwind CSS**: Good but adds build step and learning curve
- **Bootstrap/Vuetify**: Too heavy for simple layout, unnecessary components
- **Custom JavaScript resize listeners**: Not needed, CSS media queries sufficient

**Best Practices**:
- Use viewport units (vw, vh) for responsive sizing
- Touch targets minimum 44x44px for mobile usability
- Test graph readability on small screens (may need zoom controls)
- Use CSS custom properties for theme colors and spacing consistency

## Summary of Technical Decisions

| Area | Technology | Rationale |
|------|-----------|-----------|
| Framework | Vue 3 Composition API | Modern, reactive, lightweight |
| Build Tool | Vite | Fast dev server, optimized builds |
| Graphing | Chart.js v4 | Real-time capable, proven, simple |
| State | Composables | No store needed, simpler than Pinia |
| Storage | LocalStorage + JSON | Native, synchronous, sufficient capacity |
| RNG | Crypto.getRandomValues | Secure, provably fair, native |
| Animation | requestAnimationFrame | Smooth 60 FPS, browser-optimized |
| Currency | Integer cents | Precise, avoids float errors |
| Styling | Native CSS Grid/Flex | No framework overhead, performant |
| Testing | Vitest (optional) | Only for critical game logic |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LocalStorage quota exceeded | Player loses balance data | Implement circular buffer for history (max 50), add try/catch |
| User disables JavaScript | App doesn't work | Show noscript message, this is expected for SPA |
| User clears browser data | Balance/history lost | Document this limitation, future: add export/import feature |
| Float precision in multiplier | Incorrect winnings | Use integer math for currency, only floats for display |
| Chart performance on mobile | Lag/stuttering | Reduce data points, disable animations, test on real devices |
| Provable fairness skepticism | Users don't trust RNG | Document verification process clearly in UI |

## Next Steps

All technical decisions resolved. Ready to proceed to Phase 1:
- Data model definition (data-model.md)
- State contracts documentation (contracts/game-state.md)
- Quickstart guide for development setup (quickstart.md)
