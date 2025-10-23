<template>
  <div id="app">
    <header>
      <h1>Crash Game</h1>
      <p class="tagline">Watch the multiplier rise... cash out before it crashes!</p>
      <button class="reset-button" @click="handleReset">Reset Game</button>
    </header>

    <main>
      <!-- Balance Display -->
      <BalanceDisplay :balance-cents="balanceState.balanceCents" />

      <div class="game-layout">
        <div class="game-container">
          <!-- Current Multiplier Display -->
          <div class="multiplier-display" :class="stateClass">
            <div v-if="gameState.currentRound.state === 'BETTING'" class="betting-state">
              <h2>Waiting for round...</h2>
              <p class="countdown">Starting in {{ gameState.countdown }}s</p>
            </div>
            <div v-else-if="gameState.currentRound.state === 'RUNNING'" class="running-state">
              <h2 class="current-multiplier">{{ gameState.currentRound.currentMultiplier.toFixed(2) }}x</h2>
            </div>
            <div v-else-if="gameState.currentRound.state === 'CRASHED'" class="crashed-state">
              <h2 class="crash-multiplier">{{ gameState.currentRound.crashPoint.toFixed(2) }}x</h2>
              <p class="crash-message">CRASHED!</p>
            </div>
          </div>

          <!-- Game Graph -->
          <GameGraph
            :current-multiplier="gameState.currentRound.currentMultiplier"
            :crash-point="gameState.currentRound.crashPoint"
            :state="gameState.currentRound.state"
          />

          <!-- Round Info -->
          <div class="round-info">
            <span>Round #{{ gameState.currentRound.roundId }}</span>
            <span v-if="gameState.currentRound.state === 'RUNNING'">
              Time: {{ (gameState.currentRound.elapsedTime / 1000).toFixed(1) }}s
            </span>
          </div>
        </div>

        <!-- Betting Panel -->
        <div class="betting-container">
          <BettingPanel
            :balance-cents="balanceState.balanceCents"
            :state="gameState.currentRound.state"
            :current-multiplier="gameState.currentRound.currentMultiplier"
            :current-bet="balanceState.currentBet"
            @place-bet="handlePlaceBet"
            @cash-out="handleCashOut"
          />
        </div>
      </div>

      <!-- RTP Settings -->
      <RTPSettings @open-simulator="openSimulator" />

      <!-- Game History -->
      <GameHistory :rounds="historyState.rounds" :max-display="20" />
    </main>

    <!-- RTP Simulator Modal -->
    <RTPSimulator
      :is-open="isSimulatorOpen"
      :rtp-factor="rtpConfig.rtpFactor"
      @close="closeSimulator"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import GameGraph from './components/GameGraph.vue';
import BalanceDisplay from './components/BalanceDisplay.vue';
import BettingPanel from './components/BettingPanel.vue';
import GameHistory from './components/GameHistory.vue';
import RTPSettings from './components/RTPSettings.vue';
import RTPSimulator from './components/RTPSimulator.vue';
import { useGameEngine } from './composables/useGameEngine.js';
import { useBalance } from './composables/useBalance.js';
import { useGameHistory } from './composables/useGameHistory.js';
import { useRTPConfig } from './composables/useRTPConfig.js';

const { gameState, init, cleanup, on } = useGameEngine();
const { balanceState, placeBet, cashOut, loseBet, clearCurrentBet, resetBalance } = useBalance();
const { historyState, addRound, clearHistory } = useGameHistory();
const { rtpConfig } = useRTPConfig();

// RTP Simulator state
const isSimulatorOpen = ref(false);

const stateClass = computed(() => {
  return {
    'state-betting': gameState.currentRound.state === 'BETTING',
    'state-running': gameState.currentRound.state === 'RUNNING',
    'state-crashed': gameState.currentRound.state === 'CRASHED'
  };
});

function handlePlaceBet(amountCents) {
  const result = placeBet(amountCents, gameState.currentRound.roundId);
  if (!result.success) {
    alert(result.error);
  }
}

function handleCashOut() {
  const result = cashOut(gameState.currentRound.currentMultiplier);
  if (!result.success) {
    alert(result.error);
  }
}

function handleReset() {
  if (confirm('Are you sure you want to reset all game data? This will clear your balance and game history.')) {
    // Clear all game-related localStorage
    resetBalance();
    clearHistory();

    // Clear game engine state
    try {
      localStorage.removeItem('crashgame_engine');
    } catch (error) {
      console.error('Failed to clear game engine state:', error);
    }

    // Reload the page to ensure a clean state
    window.location.reload();
  }
}

function openSimulator() {
  isSimulatorOpen.value = true;
}

function closeSimulator() {
  isSimulatorOpen.value = false;
}

// Watch for state changes to clear bet at the right time
watch(() => gameState.currentRound.state, (newState, oldState) => {
  // Clear bet when transitioning from CRASHED to BETTING (new round)
  if (oldState === 'CRASHED' && newState === 'BETTING') {
    clearCurrentBet();
  }
});

// Listen to game events
on('roundStart', () => {
  // Don't clear bet here - it should persist from BETTING to RUNNING phase
  // Bet is only cleared when new BETTING phase starts (see watcher above)
});

on('roundCrash', (data) => {
  // Handle bet loss if player didn't cash out
  if (balanceState.currentBet && balanceState.currentBet.status === 'ACTIVE') {
    loseBet();
  }

  // Add round to history
  const roundSummary = {
    roundId: data.roundId,
    crashPoint: data.crashPoint,
    timestamp: Date.now(),
    playerBet: balanceState.currentBet ? {
      amountCents: balanceState.currentBet.amountCents,
      cashOutMultiplier: balanceState.currentBet.cashOutMultiplier,
      winningsCents: balanceState.currentBet.winningsCents,
      status: balanceState.currentBet.status
    } : null
  };

  addRound(roundSummary);
});

onMounted(() => {
  init();
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #ffffff;
  min-height: 100vh;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 30px;
  position: relative;
}

header h1 {
  font-size: 48px;
  font-weight: bold;
  background: linear-gradient(45deg, #00ff00, #00aa00);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
}

.tagline {
  color: #aaa;
  font-size: 18px;
  margin-bottom: 15px;
}

.reset-button {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(255, 0, 0, 0.2);
  color: #ff6666;
  border: 2px solid #ff6666;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.reset-button:hover {
  background: rgba(255, 0, 0, 0.3);
  border-color: #ff4444;
  color: #ff4444;
  transform: scale(1.05);
}

.reset-button:active {
  transform: scale(0.95);
}

.game-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.game-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.betting-container {
  display: flex;
  flex-direction: column;
}

.multiplier-display {
  text-align: center;
  padding: 40px;
  margin-bottom: 30px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.state-betting {
  background: rgba(100, 100, 100, 0.2);
}

.state-running {
  background: rgba(0, 255, 0, 0.1);
}

.state-crashed {
  background: rgba(255, 0, 0, 0.2);
}

.betting-state h2 {
  color: #aaa;
  font-size: 32px;
  margin-bottom: 10px;
}

.countdown {
  font-size: 24px;
  color: #00ff00;
  font-weight: bold;
}

.running-state .current-multiplier {
  font-size: 72px;
  font-weight: bold;
  color: #00ff00;
  text-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.crashed-state .crash-multiplier {
  font-size: 72px;
  font-weight: bold;
  color: #ff0000;
  text-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
}

.crash-message {
  font-size: 32px;
  color: #ff0000;
  font-weight: bold;
  margin-top: 10px;
}

.round-info {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  color: #aaa;
  font-size: 14px;
}

@media (max-width: 768px) {
  header h1 {
    font-size: 36px;
  }

  .game-layout {
    grid-template-columns: 1fr;
  }

  .running-state .current-multiplier,
  .crashed-state .crash-multiplier {
    font-size: 48px;
  }

  .game-container {
    padding: 15px;
  }
}
</style>
