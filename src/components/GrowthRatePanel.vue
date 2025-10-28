<template>
  <div class="growth-rate-panel">
    <div class="panel-header">
      <h3>Growth Rate Settings</h3>
    </div>

    <div class="panel-content">
      <!-- Dynamic Phases -->
      <div v-for="(phase, index) in localPhases" :key="phase.id" class="phase-container">
        <!-- Insert button (between phases) -->
        <div v-if="index > 0" class="insert-button-container">
          <button
            class="btn-insert"
            @click="handleAddPhase(index - 1)"
            :disabled="!canAddPhase"
            title="Insert phase here"
          >
            + Add Phase
          </button>
        </div>

        <div class="rate-input-group">
          <div class="phase-header-row">
            <label class="phase-label">
              Phase {{ index + 1 }}
              <span v-if="isLastPhase(index)" class="infinity-badge">∞</span>
            </label>
            <button
              v-if="canRemove(index)"
              class="btn-delete"
              @click="handleRemovePhase(index)"
              title="Delete this phase"
            >
              🗑️
            </button>
          </div>
          <div class="phase-inputs">
            <div class="time-input">
              <label v-if="!isLastPhase(index)" :for="`phase${index}-end`" class="input-label">
                End Time (s):
              </label>
              <span v-else class="input-label infinite-label">
                Duration: Infinite
              </span>
              <input
                v-if="!isLastPhase(index)"
                :id="`phase${index}-end`"
                v-model.number="phase.endTimeSeconds"
                type="number"
                step="1"
                min="1"
                @input="updateEndTime(index, phase.endTimeSeconds * 1000)"
              />
            </div>
            <div class="rate-input">
              <label :for="`phase${index}-rate`" class="input-label">Growth Rate:</label>
              <input
                :id="`phase${index}-rate`"
                v-model.number="phase.rate"
                type="number"
                step="0.0000001"
                min="0.000001"
                max="0.001"
                @input="updateRate(index, phase.rate)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Append button (at end) -->
      <div class="append-button-container">
        <button
          class="btn-append"
          @click="handleAddPhase(-1)"
          :disabled="!canAddPhase"
          title="Add phase at end"
        >
          + Add Phase at End
        </button>
        <span v-if="!canAddPhase" class="limit-hint">
          (Maximum {{ maxPhases }} phases reached)
        </span>
      </div>

      <div class="button-group">
        <button class="btn-secondary" @click="handleReset">
          Reset to Defaults
        </button>
        <button class="btn-warning" @click="handleForceRestart">
          Force Restart Round
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

// Define props
const props = defineProps({
  onForceRestart: {
    type: Function,
    required: true
  }
});

const {
  phases,
  getPhases,
  getPhaseCount,
  setGrowthRate,
  setPhaseEndTime,
  addPhase,
  removePhase,
  canRemovePhase,
  resetToDefaults
} = useGrowthRateConfig();

const { rtpConfig } = useRTPConfig();
const { simulationMode, enableSimulation, disableSimulation, setUpdateInterval } = useSimulationMode();

// Constants
const maxPhases = 10;

// Local phases with seconds conversion for inputs
const localPhases = ref([]);

// Sync local phases with config
const syncLocalPhases = () => {
  localPhases.value = phases.map(phase => ({
    ...phase,
    endTimeSeconds: phase.endTime !== null ? phase.endTime / 1000 : null
  }));
};

// Initialize local phases
syncLocalPhases();

// Watch for changes from config
watch(
  () => phases,
  () => {
    syncLocalPhases();
  },
  { deep: true }
);

// Local input values for simulation mode
const simulationEnabled = ref(simulationMode.enabled);
const updateIntervalInput = ref(simulationMode.updateInterval);

// Check if phase can be added
const canAddPhase = computed(() => {
  return getPhaseCount() < maxPhases;
});

// Check if a phase is the last one (infinite)
const isLastPhase = (index) => {
  return index === localPhases.value.length - 1;
};

// Check if a phase can be removed
const canRemove = (index) => {
  return canRemovePhase(index);
};

// Update rate with validation (now uses index instead of phase number)
const updateRate = (index, value) => {
  setGrowthRate(index, value);
};

// Update end time with validation (now uses index instead of phase number)
const updateEndTime = (index, timeMs) => {
  setPhaseEndTime(index, timeMs);
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

// Handle adding a phase
const handleAddPhase = (afterIndex) => {
  if (addPhase(afterIndex)) {
    syncLocalPhases();
  }
};

// Handle removing a phase
const handleRemovePhase = (index) => {
  if (removePhase(index)) {
    syncLocalPhases();
  }
};

// Reset to default values (restores 3-phase structure)
const handleReset = () => {
  resetToDefaults();
  syncLocalPhases();
};

// Force restart the game round
const handleForceRestart = () => {
  props.onForceRestart();
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
      phases // Now uses phases array directly
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

.phase-container {
  position: relative;
}

.insert-button-container {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}

.btn-insert {
  padding: 4px 12px;
  background-color: #2a5a2a;
  border: 1px solid #3a7a3a;
  border-radius: 4px;
  color: #88ff88;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-insert:hover:not(:disabled) {
  background-color: #3a6a3a;
  border-color: #4a8a4a;
}

.btn-insert:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.append-button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 12px 0;
  padding: 12px;
  background-color: #2a2a2a;
  border: 1px dashed #444;
  border-radius: 4px;
}

.btn-append {
  padding: 8px 16px;
  background-color: #2a5a2a;
  border: 1px solid #3a7a3a;
  border-radius: 4px;
  color: #88ff88;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-append:hover:not(:disabled) {
  background-color: #3a6a3a;
  border-color: #4a8a4a;
}

.btn-append:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.limit-hint {
  color: #888;
  font-size: 11px;
  font-style: italic;
}

.rate-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #2a2a2a;
  border-radius: 4px;
  border: 1px solid #333;
}

.phase-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.phase-label {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.infinity-badge {
  display: inline-block;
  padding: 2px 6px;
  background-color: #4a4a00;
  border: 1px solid #6a6a00;
  border-radius: 3px;
  color: #ffff88;
  font-size: 12px;
  font-weight: 700;
}

.btn-delete {
  padding: 4px 8px;
  background-color: #5a2a2a;
  border: 1px solid #7a3a3a;
  border-radius: 4px;
  color: #ff8888;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background-color: #6a3a3a;
  border-color: #8a4a4a;
}

.btn-delete:active {
  transform: scale(0.95);
}

.infinite-label {
  color: #ffff88;
  font-weight: 600;
  font-style: italic;
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

.btn-warning {
  padding: 8px 16px;
  background-color: #c44545;
  border: 1px solid #dd6666;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-warning:hover {
  background-color: #d44545;
  border-color: #ee7777;
}

.btn-warning:active {
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
