<template>
  <div class="betting-panel">
    <!-- Betting Phase UI -->
    <div v-if="state === 'BETTING'" class="betting-phase">
      <div class="bet-input-group">
        <label for="bet-amount">Bet Amount</label>
        <div class="input-wrapper">
          <span class="currency-symbol">$</span>
          <input
            id="bet-amount"
            v-model="betInput"
            type="number"
            min="1"
            max="1000"
            step="1"
            placeholder="0.00"
            :disabled="!!currentBet"
          />
        </div>
      </div>

      <button
        class="btn btn-place-bet"
        :disabled="!canBet || !!currentBet"
        @click="handlePlaceBet"
      >
        {{ currentBet ? 'Bet Placed' : 'Place Bet' }}
      </button>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-if="currentBet" class="bet-placed-info">
        Bet placed: {{ formatCurrency(currentBet.amountCents) }}
      </div>
    </div>

    <!-- Running Phase UI -->
    <div v-else-if="state === 'RUNNING'" class="running-phase">
      <div v-if="currentBet && currentBet.status === 'ACTIVE'" class="active-bet">
        <div class="potential-winnings">
          <div class="label">Potential Winnings</div>
          <div class="amount">{{ formatCurrency(potentialWinnings) }}</div>
        </div>

        <button
          class="btn btn-cash-out"
          @click="handleCashOut"
        >
          Cash Out Now!
        </button>
      </div>

      <div v-else class="no-bet">
        <p>Round in progress...</p>
        <p class="hint">Place a bet during the next betting phase</p>
      </div>
    </div>

    <!-- Crashed Phase UI -->
    <div v-else-if="state === 'CRASHED'" class="crashed-phase">
      <div v-if="lastResult" class="round-result">
        <div v-if="lastResult.won" class="result-won">
          <div class="result-label">YOU WON!</div>
          <div class="result-amount">+{{ formatCurrency(lastResult.winnings) }}</div>
        </div>
        <div v-else-if="lastResult.lost" class="result-lost">
          <div class="result-label">CRASHED!</div>
          <div class="result-amount">-{{ formatCurrency(lastResult.betAmount) }}</div>
        </div>
        <div v-else class="result-no-bet">
          <div class="result-label">No bet placed</div>
        </div>
      </div>

      <div class="next-round-info">
        Next round starting soon...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { formatCurrency, dollarsToCents } from '../utils/currency.js';

const props = defineProps({
  balanceCents: {
    type: Number,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  currentMultiplier: {
    type: Number,
    default: 1.00
  },
  currentBet: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['placeBet', 'cashOut']);

const betInput = ref('');
const errorMessage = ref('');
const lastResult = ref(null);

const canBet = computed(() => {
  if (!betInput.value) return false;
  const betCents = dollarsToCents(betInput.value);
  if (betCents < 100 || betCents > 100000) return false;
  if (props.balanceCents < betCents) return false;
  return true;
});

const potentialWinnings = computed(() => {
  if (!props.currentBet || props.currentBet.status !== 'ACTIVE') return 0;
  return Math.floor(props.currentBet.amountCents * props.currentMultiplier);
});

function handlePlaceBet() {
  try {
    const betCents = dollarsToCents(betInput.value);
    emit('placeBet', betCents);
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error.message;
  }
}

function handleCashOut() {
  emit('cashOut');
}

// Watch for state changes to track results
watch(() => props.state, (newState, oldState) => {
  if (oldState === 'RUNNING' && newState === 'CRASHED') {
    // Round just crashed - record result
    if (props.currentBet) {
      if (props.currentBet.status === 'CASHED_OUT') {
        lastResult.value = {
          won: true,
          winnings: props.currentBet.winningsCents,
          betAmount: props.currentBet.amountCents
        };
      } else if (props.currentBet.status === 'LOST') {
        lastResult.value = {
          lost: true,
          betAmount: props.currentBet.amountCents
        };
      }
    } else {
      lastResult.value = { noBet: true };
    }
  }

  if (newState === 'BETTING') {
    // Reset for next round
    betInput.value = '';
    errorMessage.value = '';
  }
});
</script>

<style scoped>
.betting-panel {
  background: rgba(0, 0, 0, 0.3);
  padding: 30px;
  border-radius: 8px;
}

.betting-phase,
.running-phase,
.crashed-phase {
  min-height: 200px;
}

.bet-input-group {
  margin-bottom: 20px;
}

.bet-input-group label {
  display: block;
  color: #aaa;
  font-size: 14px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-symbol {
  position: absolute;
  left: 15px;
  color: #aaa;
  font-size: 18px;
  font-weight: bold;
}

.input-wrapper input {
  width: 100%;
  padding: 15px 15px 15px 35px;
  font-size: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  outline: none;
  transition: all 0.3s ease;
}

.input-wrapper input:focus {
  border-color: #00ff00;
  background: rgba(255, 255, 255, 0.08);
}

.input-wrapper input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn {
  width: 100%;
  padding: 18px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-place-bet {
  background: linear-gradient(45deg, #00aa00, #00ff00);
  color: #000;
}

.btn-place-bet:hover:not(:disabled) {
  background: linear-gradient(45deg, #00ff00, #00aa00);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 0, 0.4);
}

.btn-cash-out {
  background: linear-gradient(45deg, #ff9900, #ffaa00);
  color: #000;
  animation: pulse-glow 1s ease-in-out infinite;
}

.btn-cash-out:hover {
  background: linear-gradient(45deg, #ffaa00, #ff9900);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 153, 0, 0.4);
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 153, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 153, 0, 0.8);
  }
}

.error-message {
  margin-top: 10px;
  padding: 10px;
  background: rgba(255, 0, 0, 0.2);
  border: 1px solid rgba(255, 0, 0, 0.5);
  border-radius: 4px;
  color: #ff6666;
  font-size: 14px;
}

.bet-placed-info {
  margin-top: 10px;
  padding: 10px;
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
  border-radius: 4px;
  color: #00ff00;
  text-align: center;
}

.active-bet {
  text-align: center;
}

.potential-winnings {
  margin-bottom: 20px;
  padding: 20px;
  background: rgba(255, 153, 0, 0.1);
  border-radius: 8px;
}

.potential-winnings .label {
  font-size: 14px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.potential-winnings .amount {
  font-size: 28px;
  font-weight: bold;
  color: #ffaa00;
}

.no-bet {
  text-align: center;
  padding: 40px 20px;
  color: #aaa;
}

.no-bet p {
  margin-bottom: 10px;
}

.hint {
  font-size: 14px;
  color: #666;
}

.round-result {
  text-align: center;
  padding: 30px;
}

.result-label {
  font-size: 24px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 10px;
}

.result-amount {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 10px;
}

.result-won .result-label {
  color: #00ff00;
}

.result-won .result-amount {
  color: #00ff00;
}

.result-lost .result-label {
  color: #ff0000;
}

.result-lost .result-amount {
  color: #ff0000;
}

.result-no-bet .result-label {
  color: #666;
}

.next-round-info {
  text-align: center;
  margin-top: 20px;
  color: #aaa;
  font-size: 14px;
}
</style>
