<template>
  <div class="rtp-settings">
    <div class="settings-header">
      <div>
        <h3>RTP Settings</h3>
        <span class="settings-subtitle">Return to Player Configuration</span>
      </div>
      <button class="btn-simulator" @click="$emit('open-simulator')">
        RTP Simulator
      </button>
    </div>

    <div class="rtp-control">
      <div class="rtp-display">
        <label for="rtp-slider">RTP Percentage</label>
        <div class="rtp-value">
          <span class="percentage">{{ rtpConfig.rtpPercentage.toFixed(1) }}%</span>
          <span class="house-edge">(House Edge: {{ houseEdge.toFixed(1) }}%)</span>
        </div>
      </div>

      <div class="slider-container">
        <input
          id="rtp-slider"
          v-model.number="localRTP"
          type="range"
          min="50"
          max="99"
          step="0.1"
          class="rtp-slider"
          @input="handleRTPChange"
        />
        <div class="slider-labels">
          <span>50%</span>
          <span>75%</span>
          <span>99%</span>
        </div>
      </div>

      <div class="preset-buttons">
        <button
          v-for="preset in presets"
          :key="preset.value"
          class="btn-preset"
          :class="{ active: isPresetActive(preset.value) }"
          @click="setPreset(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>

      <div class="rtp-info">
        <p class="info-text">
          <strong>What is RTP?</strong> Return to Player (RTP) is the theoretical percentage
          of wagered money that will be paid back to players over time. Higher RTP means
          more favorable odds for players.
        </p>
        <p class="example">
          <strong>Example:</strong> At {{ rtpConfig.rtpPercentage.toFixed(1) }}% RTP,
          for every $100 wagered, players can expect to get back approximately
          ${{ rtpConfig.rtpPercentage.toFixed(2) }} in the long run.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRTPConfig } from '../composables/useRTPConfig.js';

defineEmits(['open-simulator']);

const { rtpConfig, setRTPPercentage } = useRTPConfig();

// Local RTP value for slider (prevents too many updates)
const localRTP = ref(rtpConfig.rtpPercentage);

// Watch for external changes to rtpConfig
watch(() => rtpConfig.rtpPercentage, (newValue) => {
  localRTP.value = newValue;
});

const houseEdge = computed(() => {
  return 100 - rtpConfig.rtpPercentage;
});

const presets = [
  { label: '90%', value: 90 },
  { label: '95%', value: 95 },
  { label: '97%', value: 97 },
  { label: '98%', value: 98 },
  { label: '99%', value: 99 }
];

function handleRTPChange() {
  setRTPPercentage(localRTP.value);
}

function setPreset(value) {
  localRTP.value = value;
  setRTPPercentage(value);
}

function isPresetActive(value) {
  return Math.abs(rtpConfig.rtpPercentage - value) < 0.1;
}
</script>

<style scoped>
.rtp-settings {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.settings-header {
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.settings-header h3 {
  margin: 0 0 5px 0;
  font-size: 1.5em;
  font-weight: 600;
}

.settings-subtitle {
  font-size: 0.9em;
  opacity: 0.8;
}

.btn-simulator {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  color: white;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-simulator:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn-simulator:active {
  transform: translateY(0);
}

.rtp-control {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rtp-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rtp-display label {
  font-size: 1.1em;
  font-weight: 500;
}

.rtp-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.percentage {
  font-size: 2em;
  font-weight: 700;
  line-height: 1;
}

.house-edge {
  font-size: 0.85em;
  opacity: 0.7;
}

.slider-container {
  margin: 10px 0;
}

.rtp-slider {
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.rtp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.rtp-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.rtp-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: none;
  transition: transform 0.2s;
}

.rtp-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 0.85em;
  opacity: 0.7;
}

.preset-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-preset {
  flex: 1;
  min-width: 60px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-preset:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.btn-preset.active {
  background: white;
  color: #667eea;
  border-color: white;
}

.rtp-info {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 15px;
  font-size: 0.9em;
  line-height: 1.6;
}

.info-text,
.example {
  margin: 0 0 10px 0;
}

.example {
  margin-bottom: 0;
}

.info-text strong,
.example strong {
  display: block;
  margin-bottom: 5px;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .rtp-settings {
    padding: 15px;
  }

  .settings-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn-simulator {
    width: 100%;
  }

  .percentage {
    font-size: 1.5em;
  }

  .preset-buttons {
    gap: 6px;
  }

  .btn-preset {
    min-width: 50px;
    padding: 6px 8px;
    font-size: 0.85em;
  }
}
</style>
