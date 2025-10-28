<template>
  <div class="growth-rate-panel">
    <div class="panel-header">
      <h3>Growth Rate Settings</h3>
    </div>

    <div class="panel-content">
      <div class="rate-input-group">
        <label for="phase1-input">
          Phase 1 (0-10s: 1x → 2x):
        </label>
        <div class="input-wrapper">
          <input
            id="phase1-input"
            v-model.number="phase1Input"
            type="number"
            step="0.0000001"
            min="0.000001"
            max="0.001"
            @input="updateRate(1, phase1Input)"
          />
        </div>
      </div>

      <div class="rate-input-group">
        <label for="phase2-input">
          Phase 2 (10-25s: 2x → 8x):
        </label>
        <div class="input-wrapper">
          <input
            id="phase2-input"
            v-model.number="phase2Input"
            type="number"
            step="0.0000001"
            min="0.000001"
            max="0.001"
            @input="updateRate(2, phase2Input)"
          />
        </div>
      </div>

      <div class="rate-input-group">
        <label for="phase3-input">
          Phase 3 (25-35s: 8x → 50x):
        </label>
        <div class="input-wrapper">
          <input
            id="phase3-input"
            v-model.number="phase3Input"
            type="number"
            step="0.0000001"
            min="0.000001"
            max="0.001"
            @input="updateRate(3, phase3Input)"
          />
        </div>
      </div>

      <div class="button-group">
        <button class="btn-secondary" @click="handleReset">
          Reset to Defaults
        </button>
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

const { rates, setGrowthRate, resetToDefaults } = useGrowthRateConfig();
const { rtpConfig } = useRTPConfig();

// Local input values
const phase1Input = ref(rates.phase1);
const phase2Input = ref(rates.phase2);
const phase3Input = ref(rates.phase3);

// Watch for external changes to rates (e.g., from localStorage on page load)
watch(
  () => rates,
  (newRates) => {
    phase1Input.value = newRates.phase1;
    phase2Input.value = newRates.phase2;
    phase3Input.value = newRates.phase3;
  },
  { deep: true, immediate: true }
);

// Update rate with validation
const updateRate = (phase, value) => {
  setGrowthRate(phase, value);
};

// Reset to default values
const handleReset = () => {
  resetToDefaults();
  phase1Input.value = rates.phase1;
  phase2Input.value = rates.phase2;
  phase3Input.value = rates.phase3;
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
  gap: 6px;
}

.rate-input-group label {
  color: #cccccc;
  font-size: 14px;
  font-weight: 500;
}

.input-wrapper {
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 8px 12px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  font-family: 'Courier New', monospace;
}

.input-wrapper input:focus {
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
