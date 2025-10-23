<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Provably Fair Verifier</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>

      <div class="modal-body">
        <p class="description">
          Verify the fairness of any round by entering the seed and checking if it produces the expected hash.
          You can also calculate the crash point from the seed.
        </p>

        <!-- Seed Input -->
        <div class="input-group">
          <label>Seed (32 hex characters):</label>
          <input
            v-model="seed"
            type="text"
            placeholder="Enter seed (e.g., a1b2c3d4...)"
            class="input-field"
            @input="onSeedChange"
          />
          <span v-if="seed && !isValidSeed" class="error">Seed must be 32 hex characters</span>
        </div>

        <!-- Hash Seed Button -->
        <button
          class="action-btn"
          :disabled="!isValidSeed"
          @click="calculateHash"
        >
          Calculate SHA-256 Hash
        </button>

        <!-- Calculated Hash Result -->
        <div v-if="calculatedHash" class="result-group">
          <label>Calculated Hash:</label>
          <div class="result-value">
            <code>{{ calculatedHash }}</code>
            <button
              class="copy-btn"
              @click="copyToClipboard(calculatedHash)"
              title="Copy hash"
            >
              📋
            </button>
          </div>
        </div>

        <!-- Expected Hash Input (for comparison) -->
        <div class="input-group">
          <label>Expected Hash (optional, for comparison):</label>
          <input
            v-model="expectedHash"
            type="text"
            placeholder="Enter expected hash to compare"
            class="input-field"
          />
        </div>

        <!-- Hash Comparison Result -->
        <div v-if="calculatedHash && expectedHash" class="comparison-result">
          <div v-if="hashesMatch" class="match-success">
            ✓ Hashes Match! The seed is valid.
          </div>
          <div v-else class="match-failure">
            ✗ Hashes Don't Match! The seed may be incorrect.
          </div>
        </div>

        <!-- Calculate Crash Point -->
        <div class="divider"></div>

        <button
          class="action-btn secondary"
          :disabled="!isValidSeed"
          @click="calculateCrashPointFromSeed"
        >
          Calculate Crash Point from Seed
        </button>

        <!-- Crash Point Result -->
        <div v-if="calculatedCrashPoint !== null" class="result-group">
          <label>Calculated Crash Point:</label>
          <div class="crash-result">
            <span class="crash-multiplier">{{ calculatedCrashPoint.toFixed(2) }}x</span>
          </div>
          <p class="formula-explanation">
            Formula: M = {{ rtpConfig.rtpFactor.toFixed(2) }} / (1 - R), where R is derived from the seed
          </p>
        </div>

        <!-- How It Works -->
        <div class="divider"></div>

        <div class="info-section">
          <h3>How Provably Fair Works:</h3>
          <ol>
            <li>Before each round, a random seed is generated</li>
            <li>The SHA-256 hash of the seed is shown to you</li>
            <li>The game proceeds and crashes at a predetermined point</li>
            <li>After the crash, the actual seed is revealed</li>
            <li>You can verify the seed matches the hash shown earlier</li>
            <li>The crash point is calculated deterministically from the seed</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { hashSeed, seedToRandom } from '../utils/randomGenerator.js';
import { calculateCrashPoint } from '../utils/crashFormula.js';
import { useRTPConfig } from '../composables/useRTPConfig.js';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const { rtpConfig } = useRTPConfig();

const seed = ref('');
const calculatedHash = ref('');
const expectedHash = ref('');
const calculatedCrashPoint = ref(null);

const isValidSeed = computed(() => {
  return /^[0-9a-fA-F]{32}$/.test(seed.value);
});

const hashesMatch = computed(() => {
  if (!calculatedHash.value || !expectedHash.value) return false;
  return calculatedHash.value.toLowerCase() === expectedHash.value.toLowerCase();
});

function onSeedChange() {
  // Reset results when seed changes
  calculatedHash.value = '';
  calculatedCrashPoint.value = null;
}

async function calculateHash() {
  if (!isValidSeed.value) return;

  try {
    calculatedHash.value = await hashSeed(seed.value);
  } catch (error) {
    console.error('Failed to calculate hash:', error);
    alert('Failed to calculate hash. Please try again.');
  }
}

function calculateCrashPointFromSeed() {
  if (!isValidSeed.value) return;

  try {
    const random = seedToRandom(seed.value);
    const crashPoint = calculateCrashPoint(random, rtpConfig.rtpFactor);
    calculatedCrashPoint.value = crashPoint;
  } catch (error) {
    console.error('Failed to calculate crash point:', error);
    alert('Failed to calculate crash point. Please try again.');
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function close() {
  emit('close');
}
</script>

<style scoped>
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
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 150, 255, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 2px solid rgba(0, 150, 255, 0.3);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: #00aaff;
}

.close-btn {
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 25px;
}

.description {
  color: #aaa;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 25px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  font-size: 13px;
  color: #00aaff;
  margin-bottom: 8px;
  font-weight: bold;
}

.input-field {
  width: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 150, 255, 0.3);
  border-radius: 6px;
  color: #fff;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  transition: border-color 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: #00aaff;
}

.input-field::placeholder {
  color: #666;
}

.error {
  display: block;
  color: #ff6666;
  font-size: 11px;
  margin-top: 5px;
}

.action-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #00aaff 0%, #0088cc 100%);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 150, 255, 0.4);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.secondary {
  background: linear-gradient(135deg, #666 0%, #444 100%);
}

.action-btn.secondary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(100, 100, 100, 0.4);
}

.result-group {
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(0, 100, 200, 0.1);
  border: 1px solid rgba(0, 150, 255, 0.3);
  border-radius: 6px;
}

.result-group label {
  display: block;
  font-size: 12px;
  color: #00aaff;
  margin-bottom: 8px;
  font-weight: bold;
}

.result-value {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.4);
  padding: 10px;
  border-radius: 4px;
}

.result-value code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #00ff00;
  word-break: break-all;
  line-height: 1.4;
}

.copy-btn {
  background: rgba(0, 150, 255, 0.2);
  border: 1px solid rgba(0, 150, 255, 0.5);
  color: #00aaff;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: rgba(0, 150, 255, 0.3);
  border-color: #00aaff;
}

.comparison-result {
  margin-bottom: 20px;
  padding: 12px;
  border-radius: 6px;
  font-weight: bold;
  text-align: center;
}

.match-success {
  background: rgba(0, 255, 0, 0.1);
  border: 2px solid #00ff00;
  color: #00ff00;
}

.match-failure {
  background: rgba(255, 0, 0, 0.1);
  border: 2px solid #ff6666;
  color: #ff6666;
}

.crash-result {
  text-align: center;
  padding: 20px;
}

.crash-multiplier {
  font-size: 48px;
  font-weight: bold;
  color: #00ff00;
  text-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
}

.formula-explanation {
  font-size: 11px;
  color: #888;
  font-style: italic;
  margin-top: 10px;
  text-align: center;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 25px 0;
}

.info-section {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 6px;
  border-left: 3px solid #00aaff;
}

.info-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #00aaff;
}

.info-section ol {
  margin: 0;
  padding-left: 20px;
  color: #aaa;
  font-size: 12px;
  line-height: 1.8;
}

.info-section li {
  margin-bottom: 5px;
}

/* Scrollbar styles */
.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: rgba(0, 150, 255, 0.3);
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 150, 255, 0.5);
}
</style>
