<template>
  <div class="debug-panel">
    <div class="debug-header">
      <h2>Debug Mode</h2>
      <button class="close-btn" @click="$emit('close')" title="Close">×</button>
    </div>

    <div class="debug-content">
      <div class="debug-section">
        <h3>Crash Point Override</h3>
        <p class="description">
          Set a custom crash multiplier for the next round to test animation performance.
        </p>

        <div class="input-group">
          <label for="crash-input">Crash Multiplier (1.00 - 10000.00):</label>
          <div class="input-wrapper">
            <input
              id="crash-input"
              v-model="crashInput"
              type="number"
              min="1.00"
              max="10000.00"
              step="0.01"
              placeholder="e.g., 2.50"
              @keypress.enter="handleSetDebugCrash"
            />
            <span class="input-suffix">x</span>
          </div>
        </div>

        <div class="button-group">
          <button
            class="btn-primary"
            @click="handleSetDebugCrash"
            :disabled="!crashInput"
          >
            Set Debug Crash
          </button>
          <button
            class="btn-secondary"
            @click="handleClearDebug"
            :disabled="!debugState.isActive"
          >
            Clear Debug
          </button>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="debugState.isActive" class="debug-status active">
          <strong>🔧 Debug Mode Active</strong>
          <p>Next round will crash at: <strong>{{ debugState.crashPointOverride?.toFixed(2) }}x</strong></p>
        </div>
        <div v-else class="debug-status inactive">
          <strong>ℹ️ Debug Mode Inactive</strong>
          <p>Rounds are using random crash points</p>
        </div>
      </div>

      <div class="debug-section calculation-details">
        <h3>Multiplier Calculation Details</h3>
        <p class="description">
          The current multiplier rises based on these parameters:
        </p>

        <div class="detail-item">
          <label>Curve Exponent:</label>
          <div class="detail-value">
            <strong>{{ gameState.curveExponent }}</strong>
            <span class="detail-description">(Strong acceleration)</span>
          </div>
          <p class="hint">
            Controls acceleration strength. 1.0 = linear, 2.0 = moderate, 3.0 = strong, higher = more dramatic
          </p>
        </div>

        <div class="detail-item">
          <label>Base Speed Ratio:</label>
          <div class="detail-value">
            <strong>{{ gameState.baseSpeedRatio }}</strong>
            <span class="detail-description">(30% linear, 70% exponential)</span>
          </div>
          <p class="hint">
            Blend between linear and exponential movement. 0.0 = pure exponential, 1.0 = pure linear
          </p>
        </div>

        <div class="detail-item">
          <label>Time Scale:</label>
          <div class="detail-value">
            <strong>10 seconds</strong>
            <span class="detail-description">(Fixed speed reference)</span>
          </div>
          <p class="hint">
            At 10 seconds, the multiplier reaches 2.0x regardless of crash point
          </p>
        </div>

        <div class="formula-box">
          <h4>Formula:</h4>
          <code>
            multiplier = baseSpeedRatio × linearMultiplier + (1 - baseSpeedRatio) × exponentialMultiplier
          </code>
          <p class="hint">
            Where linearMultiplier = 1.00 + timeRatio, and exponentialMultiplier = 1.00 + (timeRatio ^ curveExponent)
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useDebugMode } from '../composables/useDebugMode.js';
import { useGameEngine } from '../composables/useGameEngine.js';

const { debugState, setDebugCrashPoint, clearDebugCrashPoint } = useDebugMode();
const { gameState } = useGameEngine();

const crashInput = ref('');
const errorMessage = ref('');

function handleSetDebugCrash() {
  errorMessage.value = '';

  if (!crashInput.value) {
    errorMessage.value = 'Please enter a crash multiplier';
    return;
  }

  const result = setDebugCrashPoint(crashInput.value);

  if (!result.success) {
    errorMessage.value = result.error;
  } else {
    errorMessage.value = '';
    // Keep the input value for easy adjustment
  }
}

function handleClearDebug() {
  clearDebugCrashPoint();
  crashInput.value = '';
  errorMessage.value = '';
}
</script>

<style scoped>
.debug-panel {
  background: rgba(26, 26, 46, 0.98);
  border-radius: 12px;
  padding: 0;
  max-width: 700px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.debug-header {
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(255, 140, 0, 0.2));
  border-bottom: 2px solid rgba(255, 165, 0, 0.5);
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px 12px 0 0;
}

.debug-header h2 {
  margin: 0;
  font-size: 24px;
  color: #ffaa00;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.close-btn {
  background: none;
  border: none;
  color: #ffaa00;
  font-size: 36px;
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 165, 0, 0.2);
  transform: scale(1.1);
}

.debug-content {
  padding: 30px;
  max-height: calc(90vh - 100px);
  overflow-y: auto;
}

.debug-section {
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 165, 0, 0.2);
}

.debug-section:last-child {
  margin-bottom: 0;
}

.debug-section h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #ffaa00;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.description {
  color: #aaa;
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  flex: 1;
  padding: 12px 40px 12px 15px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 165, 0, 0.3);
  border-radius: 6px;
  color: #fff;
  font-size: 16px;
  transition: all 0.3s ease;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #ffaa00;
  background: rgba(0, 0, 0, 0.6);
}

.input-wrapper input::placeholder {
  color: #666;
}

.input-suffix {
  position: absolute;
  right: 15px;
  color: #ffaa00;
  font-weight: bold;
  font-size: 16px;
  pointer-events: none;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid;
}

.btn-primary {
  background: rgba(255, 165, 0, 0.2);
  border-color: #ffaa00;
  color: #ffaa00;
}

.btn-primary:hover:not(:disabled) {
  background: rgba(255, 165, 0, 0.3);
  border-color: #ffcc00;
  color: #ffcc00;
  transform: scale(1.05);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(100, 100, 100, 0.2);
  border-color: #888;
  color: #aaa;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(100, 100, 100, 0.3);
  border-color: #aaa;
  color: #ccc;
  transform: scale(1.05);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  padding: 10px 15px;
  background: rgba(255, 0, 0, 0.2);
  border: 1px solid rgba(255, 0, 0, 0.5);
  border-radius: 6px;
  color: #ff6666;
  font-size: 14px;
  margin-bottom: 15px;
}

.debug-status {
  padding: 15px;
  border-radius: 6px;
  border: 2px solid;
}

.debug-status.active {
  background: rgba(0, 255, 0, 0.1);
  border-color: rgba(0, 255, 0, 0.5);
}

.debug-status.inactive {
  background: rgba(100, 100, 100, 0.1);
  border-color: rgba(100, 100, 100, 0.5);
}

.debug-status strong {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

.debug-status.active strong {
  color: #00ff00;
}

.debug-status.inactive strong {
  color: #aaa;
}

.debug-status p {
  margin: 0;
  color: #ccc;
  font-size: 14px;
}

.calculation-details {
  border-color: rgba(100, 150, 255, 0.3);
}

.calculation-details h3 {
  color: #88bbff;
}

.detail-item {
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border-left: 3px solid #88bbff;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item label {
  display: block;
  color: #88bbff;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}

.detail-value strong {
  color: #fff;
  font-size: 18px;
}

.detail-description {
  color: #aaa;
  font-size: 13px;
  font-style: italic;
}

.hint {
  margin: 8px 0 0 0;
  color: #888;
  font-size: 12px;
  line-height: 1.5;
  font-style: italic;
}

.formula-box {
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6px;
  border: 1px solid rgba(100, 150, 255, 0.3);
}

.formula-box h4 {
  margin: 0 0 10px 0;
  color: #88bbff;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.formula-box code {
  display: block;
  padding: 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  color: #ffcc00;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.formula-box .hint {
  margin-top: 10px;
}

/* Scrollbar styling */
.debug-content::-webkit-scrollbar {
  width: 8px;
}

.debug-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.debug-content::-webkit-scrollbar-thumb {
  background: rgba(255, 165, 0, 0.5);
  border-radius: 4px;
}

.debug-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 165, 0, 0.7);
}
</style>
