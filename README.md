# Crash Game

A Bustabit-style crash gambling game built with Vue 3 and Vite. Watch the multiplier rise in real-time and cash out before it crashes!

## Features

- **Real-time Multiplier Visualization**: Watch the multiplier increase on an animated graph
- **Interactive Betting**: Place bets and cash out at any time during the round
- **Provably Fair**: Uses cryptographically secure random number generation
- **Game History**: Track your wins and losses across all rounds
- **Persistent Balance**: Your balance and game history are saved locally

## Quick Start

### Prerequisites

- Node.js 18+ or 20+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

## How to Play

1. **Wait for Betting Phase**: Each round starts with a 5-second countdown
2. **Place Your Bet**: Enter an amount between $1.00 and $1000.00
3. **Watch the Multiplier**: The multiplier starts at 1.00x and increases over time
4. **Cash Out Before Crash**: Click "Cash Out" to win your bet × current multiplier
5. **Don't Wait Too Long**: If the round crashes before you cash out, you lose your bet!

## Game Mechanics

### Crash Point Formula

The crash point is determined using the formula:
```
M = 0.97 / (1 - R)
```
Where R is a cryptographically secure random value between 0 and 1.

### Multiplier Progression

- The multiplier increases linearly from 1.00x to the crash point
- Speed: ~1.0x per second
- Updates at 60 FPS for smooth animation

### Betting Rules

- Minimum bet: $1.00
- Maximum bet: $1000.00
- Only one bet per round
- Cannot place bets during active rounds
- Winnings are calculated as: `floor(bet × multiplier)`

### Provable Fairness

- Each round has a unique seed generated before the round starts
- The seed hash is shown before the round begins
- After the round crashes, the actual seed is revealed
- Players can verify that the crash point matches the disclosed seed

## Technical Stack

- **Framework**: Vue 3.4+ (Composition API)
- **Build Tool**: Vite 5.0+
- **Graphing**: Chart.js 4.4+
- **Storage**: LocalStorage for persistence
- **RNG**: Web Crypto API (cryptographically secure)
- **Testing**: Vitest + @vue/test-utils

## Project Structure

```
src/
├── components/
│   ├── GameGraph.vue        # Real-time multiplier chart
│   ├── BettingPanel.vue     # Bet input and cash-out controls
│   ├── GameHistory.vue      # Past rounds display
│   └── BalanceDisplay.vue   # Current balance widget
├── composables/
│   ├── useGameEngine.js     # Game loop and round management
│   ├── useBalance.js        # Balance and bet tracking
│   └── useGameHistory.js    # History persistence
├── utils/
│   ├── crashFormula.js      # Multiplier calculations
│   ├── randomGenerator.js   # Provably fair RNG
│   └── currency.js          # Money formatting helpers
├── App.vue                  # Main application
└── main.js                  # Vue initialization
```

## Performance

- **Graph Updates**: 60 FPS
- **Cash-Out Response**: <200ms
- **Bundle Size**: ~75KB gzipped
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+

## Data Persistence

The game saves the following data to localStorage:

- Player balance
- Last 50 transactions
- Last 50 game rounds with results

To reset your data:
- Clear your browser's localStorage for this site
- Or use browser DevTools → Application → Local Storage

## Development

### Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test -- --run
```

### Building for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Deployment

The built files are static and can be deployed to any hosting service:

- Vercel
- Netlify
- GitHub Pages
- Any static file server

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Inspired by Bustabit
- Built as a demonstration of Vue 3 and provably fair gaming mechanics
