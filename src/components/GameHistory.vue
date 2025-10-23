<template>
  <div class="game-history">
    <h3>Game History</h3>

    <div v-if="rounds.length === 0" class="empty-history">
      <p>No game history yet</p>
      <p class="hint">Play some rounds to see history</p>
    </div>

    <div v-else class="history-list">
      <div
        v-for="round in displayRounds"
        :key="`${round.roundId}-${round.timestamp}`"
        class="history-item"
        :class="getResultClass(round)"
      >
        <div class="round-header">
          <span class="round-id">#{{ round.roundId }}</span>
          <span class="crash-point">{{ round.crashPoint.toFixed(2) }}x</span>
        </div>

        <div class="round-details">
          <span class="timestamp">{{ formatTime(round.timestamp) }}</span>

          <div v-if="round.playerBet" class="player-result">
            <span v-if="round.playerBet.status === 'CASHED_OUT'" class="result-won">
              Won: {{ formatCurrency(round.playerBet.winningsCents) }}
            </span>
            <span v-else class="result-lost">
              Lost: {{ formatCurrency(round.playerBet.amountCents) }}
            </span>
          </div>
          <div v-else class="no-bet">
            No bet
          </div>
        </div>

        <!-- Provably Fair Info (expandable) -->
        <div v-if="expandedRound === round.roundId" class="fairness-details">
          <div class="seed-item">
            <label>Seed Hash:</label>
            <div class="seed-display">
              <code>{{ round.seedHash }}</code>
              <button
                class="copy-icon"
                @click.stop="copyToClipboard(round.seedHash)"
                title="Copy seed hash"
              >
                📋
              </button>
            </div>
          </div>
          <div class="seed-item">
            <label>Seed:</label>
            <div class="seed-display">
              <code class="seed-value">{{ round.seed }}</code>
              <button
                class="copy-icon"
                @click.stop="copyToClipboard(round.seed)"
                title="Copy seed"
              >
                📋
              </button>
            </div>
          </div>
          <p class="verify-hint">Use SHA-256 to verify the seed produces the hash above.</p>
        </div>

        <!-- Toggle button -->
        <button
          class="toggle-fairness"
          @click="toggleExpand(round.roundId)"
        >
          {{ expandedRound === round.roundId ? 'Hide' : 'Show' }} Provably Fair Data
        </button>
      </div>
    </div>

    <div v-if="rounds.length > maxDisplay" class="show-more">
      Showing {{ maxDisplay }} of {{ rounds.length }} rounds
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { formatCurrency } from '../utils/currency.js';

const props = defineProps({
  rounds: {
    type: Array,
    required: true,
    default: () => []
  },
  maxDisplay: {
    type: Number,
    default: 20
  }
});

const expandedRound = ref(null);

const displayRounds = computed(() => {
  return props.rounds.slice(0, props.maxDisplay);
});

function toggleExpand(roundId) {
  if (expandedRound.value === roundId) {
    expandedRound.value = null;
  } else {
    expandedRound.value = roundId;
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Could add a toast notification here instead of alert
    console.log('Copied to clipboard:', text.substring(0, 10) + '...');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function getResultClass(round) {
  if (!round.playerBet) return 'no-bet-class';
  if (round.playerBet.status === 'CASHED_OUT') return 'won-class';
  return 'lost-class';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return mins + 'm ago';
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return hours + 'h ago';
  }

  // Show date
  return date.toLocaleDateString();
}
</script>

<style scoped>
.game-history {
  background: rgba(0, 0, 0, 0.3);
  padding: 20px;
  border-radius: 8px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

h3 {
  margin-bottom: 15px;
  font-size: 20px;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}

.empty-history {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-history p {
  margin-bottom: 5px;
}

.hint {
  font-size: 14px;
}

.history-list {
  overflow-y: auto;
  flex: 1;
}

.history-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 3px solid #666;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.won-class {
  border-left-color: #00ff00;
}

.lost-class {
  border-left-color: #ff0000;
}

.no-bet-class {
  border-left-color: #666;
}

.round-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.round-id {
  font-size: 12px;
  color: #aaa;
  font-weight: bold;
}

.crash-point {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.round-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.timestamp {
  color: #666;
  font-size: 11px;
}

.player-result {
  font-weight: bold;
}

.result-won {
  color: #00ff00;
}

.result-lost {
  color: #ff6666;
}

.no-bet {
  color: #666;
  font-size: 12px;
}

.show-more {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  color: #666;
  font-size: 12px;
}

/* Scrollbar styles */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.toggle-fairness {
  width: 100%;
  margin-top: 10px;
  padding: 6px 12px;
  background: rgba(0, 150, 255, 0.1);
  border: 1px solid rgba(0, 150, 255, 0.3);
  color: #00aaff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toggle-fairness:hover {
  background: rgba(0, 150, 255, 0.2);
  border-color: #00aaff;
}

.fairness-details {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 100, 200, 0.1);
  border: 1px solid rgba(0, 150, 255, 0.2);
  border-radius: 6px;
}

.seed-item {
  margin-bottom: 10px;
}

.seed-item:last-of-type {
  margin-bottom: 5px;
}

.seed-item label {
  display: block;
  font-size: 10px;
  color: #aaa;
  margin-bottom: 4px;
  font-weight: bold;
  text-transform: uppercase;
}

.seed-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 8px;
  border-radius: 4px;
}

.seed-display code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 9px;
  color: #fff;
  word-break: break-all;
  line-height: 1.3;
}

.seed-display .seed-value {
  color: #00ff00;
}

.copy-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.copy-icon:hover {
  opacity: 1;
}

.verify-hint {
  font-size: 9px;
  color: #888;
  font-style: italic;
  margin: 8px 0 0 0;
}
</style>
