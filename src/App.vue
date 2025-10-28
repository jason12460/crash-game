<template>
  <div id="app">
    <header>
      <h1>Crash Game</h1>
      <p class="tagline">Watch the multiplier rise... cash out before it crashes!</p>
      <div class="header-buttons">
        <button class="debug-button" @click="openDebugPanel">Debug Mode</button>
        <button class="rtp-settings-button" @click="openRTPSettings">RTP Settings</button>
        <button class="reset-button" @click="handleReset">Reset Game</button>
      </div>
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

          <!-- Growth Curve Chart -->
          <GrowthCurveChart />

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
            @cancel-bet="handleCancelBet"
          />

          <!-- Growth Rate Settings Panel -->
          <GrowthRatePanel />

          <!-- Provably Fair Information -->
          <div class="fairness-info">
            <div class="fairness-header">
              <h4>Provably Fair</h4>
              <button class="verify-btn" @click="openVerifier" title="Open verification tool">
                🔍 Verify
              </button>
            </div>

            <!-- Seed Hash (shown before and during round) -->
            <div v-if="gameState.currentRound.state !== 'CRASHED'" class="seed-info">
              <label>Seed Hash (SHA-256):</label>
              <div class="seed-value">
                <code>{{ gameState.currentRound.seedHash }}</code>
                <button
                  class="copy-btn"
                  @click="copyToClipboard(gameState.currentRound.seedHash, 'Seed hash copied!')"
                  title="Copy seed hash"
                >
                  📋
                </button>
              </div>
              <p class="hint">This hash is generated before the round starts and proves the outcome was predetermined.</p>
            </div>

            <!-- Actual Seed (shown after crash) -->
            <div v-else class="seed-info revealed">
              <label>Seed Hash (SHA-256):</label>
              <div class="seed-value">
                <code>{{ gameState.currentRound.seedHash }}</code>
                <button
                  class="copy-btn"
                  @click="copyToClipboard(gameState.currentRound.seedHash, 'Seed hash copied!')"
                  title="Copy seed hash"
                >
                  📋
                </button>
              </div>

              <label class="revealed-label">Revealed Seed:</label>
              <div class="seed-value">
                <code class="revealed-seed">{{ gameState.currentRound.seed }}</code>
                <button
                  class="copy-btn"
                  @click="copyToClipboard(gameState.currentRound.seed, 'Seed copied!')"
                  title="Copy seed"
                >
                  📋
                </button>
              </div>
              <p class="hint">Verify this seed produces the hash above using SHA-256.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Game History -->
      <GameHistory :rounds="historyState.rounds" :max-display="20" />
    </main>

    <!-- Debug Panel Modal -->
    <div v-if="isDebugPanelOpen" class="modal-overlay" @click="closeDebugPanel">
      <div class="modal-content debug-modal" @click.stop>
        <DebugPanel @close="closeDebugPanel" />
      </div>
    </div>

    <!-- RTP Settings Modal -->
    <div v-if="isRTPSettingsOpen" class="modal-overlay" @click="closeRTPSettings">
      <div class="modal-content rtp-settings-modal" @click.stop>
        <RTPSettings @open-simulator="openSimulator" />
      </div>
    </div>

    <!-- RTP Simulator Modal -->
    <RTPSimulator
      :is-open="isSimulatorOpen"
      :rtp-factor="rtpConfig.rtpFactor"
      @close="closeSimulator"
    />

    <!-- Fairness Verifier Modal -->
    <FairnessVerifier
      :is-open="isVerifierOpen"
      @close="closeVerifier"
    />

    <!-- Toast Notification -->
    <div v-if="toastVisible" class="toast">
      {{ toastMessage }}
    </div>
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
import FairnessVerifier from './components/FairnessVerifier.vue';
import DebugPanel from './components/DebugPanel.vue';
import GrowthRatePanel from './components/GrowthRatePanel.vue';
import GrowthCurveChart from './components/GrowthCurveChart.vue';
import { useGameEngine } from './composables/useGameEngine.js';
import { useBalance } from './composables/useBalance.js';
import { useGameHistory } from './composables/useGameHistory.js';
import { useRTPConfig } from './composables/useRTPConfig.js';

const { gameState, init, cleanup, on } = useGameEngine();
const { balanceState, placeBet, cashOut, cancelBet, loseBet, clearCurrentBet, resetBalance } = useBalance();
const { historyState, addRound, clearHistory } = useGameHistory();
const { rtpConfig } = useRTPConfig();

// Debug Panel state
const isDebugPanelOpen = ref(false);

// RTP Settings state
const isRTPSettingsOpen = ref(false);

// RTP Simulator state
const isSimulatorOpen = ref(false);

// Fairness Verifier state
const isVerifierOpen = ref(false);

// Toast notification state
const toastMessage = ref('');
const toastVisible = ref(false);

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

function handleCancelBet() {
  const result = cancelBet();
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

function openDebugPanel() {
  isDebugPanelOpen.value = true;
}

function closeDebugPanel() {
  isDebugPanelOpen.value = false;
}

function openRTPSettings() {
  isRTPSettingsOpen.value = true;
}

function closeRTPSettings() {
  isRTPSettingsOpen.value = false;
}

function openSimulator() {
  isSimulatorOpen.value = true;
}

function closeSimulator() {
  isSimulatorOpen.value = false;
}

function openVerifier() {
  isVerifierOpen.value = true;
}

function closeVerifier() {
  isVerifierOpen.value = false;
}

function showToast(message) {
  toastMessage.value = message;
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
  }, 2000);
}

function copyToClipboard(text, message = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(message);
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy');
  });
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
    seed: data.seed,
    seedHash: gameState.currentRound.seedHash,
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

.header-buttons {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 10px;
}

.debug-button {
  background: rgba(255, 165, 0, 0.2);
  color: #ffaa00;
  border: 2px solid #ffaa00;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.debug-button:hover {
  background: rgba(255, 165, 0, 0.3);
  border-color: #ffcc00;
  color: #ffcc00;
  transform: scale(1.05);
}

.debug-button:active {
  transform: scale(0.95);
}

.rtp-settings-button {
  background: rgba(128, 0, 255, 0.2);
  color: #bb88ff;
  border: 2px solid #bb88ff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.rtp-settings-button:hover {
  background: rgba(128, 0, 255, 0.3);
  border-color: #dd99ff;
  color: #dd99ff;
  transform: scale(1.05);
}

.rtp-settings-button:active {
  transform: scale(0.95);
}

.reset-button {
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

.fairness-info {
  margin-top: 20px;
  padding: 20px;
  background: rgba(0, 100, 200, 0.1);
  border: 1px solid rgba(0, 150, 255, 0.3);
  border-radius: 8px;
}

.fairness-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.fairness-info h4 {
  margin: 0;
  font-size: 16px;
  color: #00aaff;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.verify-btn {
  background: rgba(0, 200, 0, 0.2);
  border: 1px solid rgba(0, 200, 0, 0.5);
  color: #00ff00;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.verify-btn:hover {
  background: rgba(0, 200, 0, 0.3);
  border-color: #00ff00;
  transform: scale(1.05);
}

.verify-btn:active {
  transform: scale(0.95);
}

.seed-info {
  margin-bottom: 10px;
}

.seed-info label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 5px;
  font-weight: bold;
}

.seed-info .revealed-label {
  margin-top: 15px;
  color: #00ff00;
}

.seed-value {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.4);
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.seed-value code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #fff;
  word-break: break-all;
  line-height: 1.4;
}

.seed-value .revealed-seed {
  color: #00ff00;
  font-weight: bold;
}

.copy-btn {
  background: rgba(0, 150, 255, 0.2);
  border: 1px solid rgba(0, 150, 255, 0.5);
  color: #00aaff;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: rgba(0, 150, 255, 0.3);
  border-color: #00aaff;
  transform: scale(1.05);
}

.copy-btn:active {
  transform: scale(0.95);
}

.seed-info .hint {
  font-size: 11px;
  color: #888;
  font-style: italic;
  margin: 5px 0 0 0;
}

.seed-info.revealed {
  border-left: 3px solid #00ff00;
  padding-left: 15px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  position: relative;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(26, 26, 46, 0.98);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.debug-modal {
  width: 100%;
  padding: 0;
}

.rtp-settings-modal {
  width: 100%;
  padding: 0;
}

.toast {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 150, 255, 0.95);
  color: white;
  padding: 14px 28px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: bold;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 2000;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
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
