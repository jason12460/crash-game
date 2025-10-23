<template>
  <Transition name="modal">
    <div v-if="isOpen" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h2>RTP Simulator</h2>
          <button class="close-button" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <p class="description">
            Simulate your expected returns based on a fixed cash-out strategy.
            All calculations are instant and based on mathematical formulas.
          </p>

          <!-- Input Section -->
          <div class="input-section">
            <div class="input-group">
              <label for="target-multiplier">
                Cash-Out Target
                <span class="input-hint">When to cash out</span>
              </label>
              <div class="input-with-unit">
                <input
                  id="target-multiplier"
                  v-model.number="targetMultiplier"
                  type="number"
                  min="1.01"
                  max="100"
                  step="0.1"
                  class="input-field"
                />
                <span class="unit">x</span>
              </div>
            </div>

            <div class="input-group">
              <label for="num-rounds">
                Number of Rounds
                <span class="input-hint">How many games to simulate</span>
              </label>
              <input
                id="num-rounds"
                v-model.number="numRounds"
                type="number"
                min="100"
                max="100000"
                step="100"
                class="input-field"
              />
            </div>

            <div class="input-group">
              <label for="bet-amount">
                Bet per Round
                <span class="input-hint">Amount to bet each game</span>
              </label>
              <div class="input-with-unit">
                <span class="unit-prefix">$</span>
                <input
                  id="bet-amount"
                  v-model.number="betAmount"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  class="input-field"
                />
              </div>
            </div>

            <button class="btn-simulate" @click="runSimulation">
              Run Simulation
            </button>
          </div>

          <!-- Results Section -->
          <div v-if="results" class="results-section">
            <h3>Simulation Results</h3>

            <div class="results-grid">
              <div class="result-card">
                <div class="result-label">Actual Win Rate</div>
                <div class="result-value highlight-blue">
                  {{ (results.winRate * 100).toFixed(2) }}%
                </div>
                <div class="result-detail">
                  {{ results.actualWins }} wins / {{ results.actualLosses }} losses
                </div>
                <div class="result-variance" :class="varianceClass(results.winRateVariance)">
                  {{ varianceText(results.winRateVariance, true) }} vs expected
                </div>
              </div>

              <div class="result-card">
                <div class="result-label">Total Wagered</div>
                <div class="result-value">
                  ${{ results.totalBetDollars.toFixed(2) }}
                </div>
                <div class="result-detail">
                  {{ results.numRounds.toLocaleString() }} rounds × ${{ betAmount }}
                </div>
              </div>

              <div class="result-card">
                <div class="result-label">Total Payout</div>
                <div class="result-value">
                  ${{ results.totalPayoutDollars.toFixed(2) }}
                </div>
                <div class="result-detail">
                  Actual winnings received
                </div>
              </div>

              <div class="result-card">
                <div class="result-label">Actual RTP</div>
                <div class="result-value highlight-purple">
                  {{ results.actualRTPPercentage.toFixed(2) }}%
                </div>
                <div class="result-detail">
                  Theoretical: {{ results.theoreticalRTPPercentage.toFixed(2) }}%
                </div>
                <div class="result-variance" :class="varianceClass(results.rtpVariance)">
                  {{ varianceText(results.rtpVariance, false) }} variance
                </div>
              </div>

              <div class="result-card highlight-card">
                <div class="result-label">Net Profit/Loss</div>
                <div class="result-value" :class="profitClass">
                  {{ profitSign }}${{ Math.abs(results.profitLossDollars).toFixed(2) }}
                </div>
                <div class="result-detail">
                  {{ profitPercentage }}
                </div>
              </div>
            </div>

            <!-- Statistics Grid -->
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Max Crash Point:</span>
                <span class="stat-value">{{ results.maxCrashPoint.toFixed(2) }}x</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Min Crash Point:</span>
                <span class="stat-value">{{ results.minCrashPoint.toFixed(2) }}x</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Max Win Streak:</span>
                <span class="stat-value success">{{ results.maxConsecutiveWins }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Max Loss Streak:</span>
                <span class="stat-value danger">{{ results.maxConsecutiveLosses }}</span>
              </div>
            </div>

            <!-- Info Box -->
            <div class="info-box">
              <strong>Interpretation:</strong>
              <p>
                This simulation ran {{ results.numRounds.toLocaleString() }} actual games with randomly
                generated crash points. The variance you see ({{ ((results.rtpVariance) * 100).toFixed(2) }}%)
                represents real luck fluctuation. Run the simulation again to see different results!
              </p>
              <p v-if="Math.abs(results.rtpVariance) < 0.05">
                Your results are close to the theoretical {{ (rtpFactor * 100).toFixed(1) }}% RTP.
                This is typical variance for {{ results.numRounds.toLocaleString() }} rounds.
              </p>
              <p v-else-if="results.rtpVariance > 0">
                You got lucky! Your actual RTP is {{ ((results.rtpVariance) * 100).toFixed(2) }}% higher
                than expected. This won't always happen in real play.
              </p>
              <p v-else>
                You were unlucky this time. Your actual RTP is {{ (Math.abs(results.rtpVariance) * 100).toFixed(2) }}%
                lower than expected. This is normal variance and will even out over more rounds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRTPSimulator } from '../composables/useRTPSimulator.js';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  rtpFactor: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['close']);

const { runSimulation: runSimulationFn } = useRTPSimulator();

// Input values
const targetMultiplier = ref(2.0);
const numRounds = ref(1000);
const betAmount = ref(10);

// Results
const results = ref(null);

// Computed properties
const profitClass = computed(() => {
  if (!results.value) return '';
  return results.value.profitLossDollars >= 0 ? 'profit' : 'loss';
});

const profitSign = computed(() => {
  if (!results.value) return '';
  return results.value.profitLossDollars >= 0 ? '+' : '-';
});

const profitPercentage = computed(() => {
  if (!results.value) return '';
  const percentage = (results.value.profitLossDollars / results.value.totalBetDollars) * 100;
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}% of total wagered`;
});

// Methods
function runSimulation() {
  try {
    results.value = runSimulationFn({
      rtpFactor: props.rtpFactor,
      targetMultiplier: targetMultiplier.value,
      numRounds: numRounds.value,
      betAmountCents: betAmount.value * 100
    });
  } catch (error) {
    alert('Simulation error: ' + error.message);
  }
}

function closeModal() {
  emit('close');
}

function varianceClass(variance) {
  if (variance > 0.01) return 'positive';
  if (variance < -0.01) return 'negative';
  return 'neutral';
}

function varianceText(variance, isPercentage) {
  const value = Math.abs(variance) * 100;
  const sign = variance >= 0 ? '+' : '-';
  if (isPercentage) {
    return `${sign}${value.toFixed(2)}%`;
  } else {
    return `${sign}${value.toFixed(2)}%`;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
  border-radius: 16px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 28px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-button {
  background: none;
  border: none;
  color: #fff;
  font-size: 36px;
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: rotate(90deg);
}

.modal-body {
  padding: 24px;
}

.description {
  color: #aaa;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.input-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group:last-of-type {
  margin-bottom: 0;
}

.input-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.input-hint {
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: #888;
  margin-top: 2px;
}

.input-field {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  transition: all 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.15);
}

.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-unit .input-field {
  padding-right: 40px;
}

.input-with-unit.has-prefix .input-field {
  padding-left: 40px;
}

.unit {
  position: absolute;
  right: 12px;
  color: #aaa;
  font-size: 16px;
  font-weight: 600;
  pointer-events: none;
}

.unit-prefix {
  position: absolute;
  left: 12px;
  color: #aaa;
  font-size: 16px;
  font-weight: 600;
  pointer-events: none;
  z-index: 1;
}

.input-with-unit:has(.unit-prefix) .input-field {
  padding-left: 32px;
}

.btn-simulate {
  width: 100%;
  padding: 14px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20px;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-simulate:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-simulate:active {
  transform: translateY(0);
}

.results-section h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #fff;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.result-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s;
}

.result-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.highlight-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border-color: rgba(102, 126, 234, 0.5);
}

.result-label {
  font-size: 12px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.result-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.result-value.highlight-blue {
  color: #64b5f6;
}

.result-value.highlight-purple {
  color: #ba68c8;
}

.result-value.profit {
  color: #4caf50;
}

.result-value.loss {
  color: #f44336;
}

.result-detail {
  font-size: 11px;
  color: #888;
}

.result-variance {
  font-size: 10px;
  margin-top: 4px;
  font-weight: 600;
}

.result-variance.positive {
  color: #4caf50;
}

.result-variance.negative {
  color: #f44336;
}

.result-variance.neutral {
  color: #888;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.stat-label {
  color: #aaa;
}

.stat-value {
  color: #fff;
  font-weight: 600;
}

.stat-value.success {
  color: #4caf50;
}

.stat-value.danger {
  color: #f44336;
}

.info-box {
  background: rgba(102, 126, 234, 0.1);
  border-left: 4px solid #667eea;
  border-radius: 8px;
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #ddd;
}

.info-box strong {
  display: block;
  margin-bottom: 8px;
  color: #fff;
}

.info-box p {
  margin: 0 0 8px 0;
}

.info-box p:last-child {
  margin-bottom: 0;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .modal-container {
    max-height: 95vh;
  }

  .modal-header {
    padding: 20px;
  }

  .modal-header h2 {
    font-size: 24px;
  }

  .modal-body {
    padding: 20px;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .result-value {
    font-size: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
