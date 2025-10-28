<template>
  <div class="growth-rate-panel">
    <div class="panel-header">
      <h3>Growth Rate Settings</h3>
    </div>

    <div class="panel-content">
      <!-- Phase 1 -->
      <div class="rate-input-group">
        <label class="phase-label">Phase 1:</label>
        <div class="phase-inputs">
          <div class="time-input">
            <label for="phase1-end" class="input-label">End Time (s):</label>
            <input
              id="phase1-end"
              v-model.number="phase1EndInput"
              type="number"
              step="1"
              min="1"
              @input="updateEndTime(1, phase1EndInput * 1000)"
            />
          </div>
          <div class="rate-input">
            <label for="phase1-rate" class="input-label">Growth Rate:</label>
            <input
              id="phase1-rate"
              v-model.number="phase1Input"
              type="number"
              step="0.0000001"
              min="0.000001"
              max="0.001"
              @input="updateRate(1, phase1Input)"
            />
          </div>
        </div>
      </div>

      <!-- Phase 2 -->
      <div class="rate-input-group">
        <label class="phase-label">Phase 2:</label>
        <div class="phase-inputs">
          <div class="time-input">
            <label for="phase2-end" class="input-label">End Time (s):</label>
            <input
              id="phase2-end"
              v-model.number="phase2EndInput"
              type="number"
              step="1"
              min="1"
              @input="updateEndTime(2, phase2EndInput * 1000)"
            />
          </div>
          <div class="rate-input">
            <label for="phase2-rate" class="input-label">Growth Rate:</label>
            <input
              id="phase2-rate"
              v-model.number="phase2Input"
              type="number"
              step="0.0000001"
              min="0.000001"
              max="0.001"
              @input="updateRate(2, phase2Input)"
            />
          </div>
        </div>
      </div>

      <!-- Phase 3 -->
      <div class="rate-input-group">
        <label class="phase-label">Phase 3:</label>
        <div class="phase-inputs">
          <div class="time-input">
            <span class="input-label">Start Time (s): {{ (timeEndPoints.phase2 / 1000).toFixed(0) }}+</span>
          </div>
          <div class="rate-input">
            <label for="phase3-rate" class="input-label">Growth Rate:</label>
            <input
              id="phase3-rate"
              v-model.number="phase3Input"
              type="number"
              step="0.0000001"
              min="0.000001"
              max="0.001"
              @input="updateRate(3, phase3Input)"
            />
          </div>
        </div>
      </div>

      <div class="button-group">
        <button class="btn-secondary" @click="handleReset">
          Reset to Defaults
        </button>
      </div>

      <!-- Simulation Mode Section -->
      <div class="simulation-section">
        <div class="simulation-header">
          <label class="toggle-label">
            <input
              type="checkbox"
              v-model="simulationEnabled"
              @change="toggleSimulation"
              class="toggle-checkbox"
            />
            <span class="toggle-text">啟用後端模擬模式</span>
          </label>
        </div>
        <div class="simulation-controls">
          <div class="interval-input-group">
            <label for="interval-input" class="input-label">更新間隔 (ms):</label>
            <input
              id="interval-input"
              v-model.number="updateIntervalInput"
              type="number"
              step="10"
              min="10"
              max="1000"
              @input="handleIntervalChange"
              :disabled="!simulationEnabled"
            />
          </div>
          <div class="simulation-status">
            <span v-if="simulationEnabled" class="status-active">
              模擬模式：每 {{ simulationMode.updateInterval }}ms 更新
            </span>
            <span v-else class="status-smooth">
              流暢模式：60 FPS
            </span>
          </div>
        </div>
      </div>

      <div class="avg-time-section">
        <div class="avg-time-label">平均遊戲時間 (100x cap):</div>
        <div class="avg-time-value">{{ averageGameTime }} 秒</div>
        <div class="avg-time-hint">基於統計模擬的預期遊戲時長</div>
      </div>

      <div class="preview-section">
        <h4>Real-time Preview (0-60s):</h4>
        <div class="preview-grid">
          <div
            v-for="interval in previewIntervals"
            :key="interval.time"
            class="preview-item"
          >
            <span class="time">{{ interval.time }}s</span>
            <span class="arrow">→</span>
            <span class="multiplier">{{ interval.multiplier }}x</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGrowthRateConfig } from '@/composables/useGrowthRateConfig';
import { calculateCurrentMultiplier, calculateAverageGameTime } from '@/utils/crashFormula';
import { useRTPConfig } from '@/composables/useRTPConfig';
import { useSimulationMode } from '@/composables/useSimulationMode';

const { rates, timeEndPoints, setGrowthRate, setPhaseEndTime, resetToDefaults } = useGrowthRateConfig();
const { rtpConfig } = useRTPConfig();
const { simulationMode, enableSimulation, disableSimulation, setUpdateInterval } = useSimulationMode();

// Local input values for growth rates
const phase1Input = ref(rates.phase1);
const phase2Input = ref(rates.phase2);
const phase3Input = ref(rates.phase3);

// Local input values for time boundaries (in seconds)
const phase1EndInput = ref(timeEndPoints.phase1 / 1000);
const phase2EndInput = ref(timeEndPoints.phase2 / 1000);

// Local input values for simulation mode
const simulationEnabled = ref(simulationMode.enabled);
const updateIntervalInput = ref(simulationMode.updateInterval);

// Watch for external changes to rates
watch(
  () => rates,
  (newRates) => {
    phase1Input.value = newRates.phase1;
    phase2Input.value = newRates.phase2;
    phase3Input.value = newRates.phase3;
  },
  { deep: true, immediate: true }
);

// Watch for external changes to time endpoints
watch(
  () => timeEndPoints,
  (newEndPoints) => {
    phase1EndInput.value = newEndPoints.phase1 / 1000;
    phase2EndInput.value = newEndPoints.phase2 / 1000;
  },
  { deep: true, immediate: true }
);

// Update rate with validation
const updateRate = (phase, value) => {
  setGrowthRate(phase, value);
};

// Update end time with validation
const updateEndTime = (phase, timeMs) => {
  setPhaseEndTime(phase, timeMs);
};

// Toggle simulation mode
const toggleSimulation = () => {
  if (simulationEnabled.value) {
    enableSimulation();
  } else {
    disableSimulation();
  }
};

// Handle interval change
const handleIntervalChange = () => {
  setUpdateInterval(updateIntervalInput.value);
};

// Watch for external changes to simulation mode
watch(
  () => simulationMode,
  (newMode) => {
    simulationEnabled.value = newMode.enabled;
    updateIntervalInput.value = newMode.updateInterval;
  },
  { deep: true, immediate: true }
);

// Reset to default values
const handleReset = () => {
  resetToDefaults();
  phase1Input.value = rates.phase1;
  phase2Input.value = rates.phase2;
  phase3Input.value = rates.phase3;
  phase1EndInput.value = timeEndPoints.phase1 / 1000;
  phase2EndInput.value = timeEndPoints.phase2 / 1000;
};

// Real-time preview calculations for every 5 seconds up to 60 seconds
const previewIntervals = computed(() => {
  const intervals = [];
  for (let seconds = 5; seconds <= 60; seconds += 5) {
    try {
      const multiplier = calculateCurrentMultiplier(seconds * 1000);
      intervals.push({
        time: seconds,
        multiplier: multiplier.toFixed(2)
      });
    } catch (e) {
      intervals.push({
        time: seconds,
        multiplier: 'Error'
      });
    }
  }
  return intervals;
});

// Calculate average game time with 100x cap using mathematical expectation
const averageGameTime = computed(() => {
  try {
    const avgTime = calculateAverageGameTime(
      100, // max multiplier
      rtpConfig.rtpFactor || 0.97,
      rates
    );
    return avgTime.toFixed(1);
  } catch (e) {
    return 'N/A';
  }
});
</script>

<style scoped>
.growth-rate-panel {
  background-color: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.panel-header {
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rate-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #2a2a2a;
  border-radius: 4px;
}

.phase-label {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.phase-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.time-input,
.rate-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-label {
  color: #cccccc;
  font-size: 12px;
  font-weight: 500;
}

.time-input input,
.rate-input input {
  width: 100%;
  padding: 8px 12px;
  background-color: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  font-family: 'Courier New', monospace;
}

.time-input input:focus,
.rate-input input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-secondary {
  padding: 8px 16px;
  background-color: #444;
  border: 1px solid #666;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background-color: #555;
  border-color: #777;
}

.btn-secondary:active {
  transform: translateY(1px);
}

.simulation-section {
  margin-top: 16px;
  padding: 12px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
}

.simulation-header {
  margin-bottom: 12px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4a90e2;
}

.toggle-text {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.simulation-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.interval-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.interval-input-group input {
  flex: 1;
  padding: 6px 10px;
  background-color: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}

.interval-input-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.interval-input-group input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.simulation-status {
  padding: 8px;
  background-color: #1a1a1a;
  border-radius: 4px;
  text-align: center;
}

.status-active {
  color: #ffa500;
  font-size: 12px;
  font-weight: 600;
}

.status-smooth {
  color: #00ff88;
  font-size: 12px;
  font-weight: 600;
}

.avg-time-section {
  margin-top: 16px;
  padding: 12px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  text-align: center;
}

.avg-time-label {
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.avg-time-value {
  color: #ffa500;
  font-size: 24px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  margin-bottom: 6px;
}

.avg-time-hint {
  color: #888888;
  font-size: 11px;
  font-style: italic;
}

.preview-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preview-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
}

.preview-item .time {
  color: #4a90e2;
  font-weight: 600;
  font-size: 14px;
}

.preview-item .arrow {
  color: #666;
}

.preview-item .multiplier {
  color: #00ff88;
  font-weight: 700;
  font-size: 16px;
  font-family: 'Courier New', monospace;
}
</style>
