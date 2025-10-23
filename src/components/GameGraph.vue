<template>
  <div class="game-graph">
    <canvas ref="chartCanvas"></canvas>
    <div v-if="state === 'CRASHED'" class="crash-marker">
      CRASHED AT {{ crashPoint.toFixed(2) }}x
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale } from 'chart.js';

// Register Chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);

const props = defineProps({
  currentMultiplier: {
    type: Number,
    required: true,
    default: 1.00
  },
  crashPoint: {
    type: Number,
    default: null
  },
  state: {
    type: String,
    required: true,
    default: 'BETTING'
  }
});

const chartCanvas = ref(null);
let chart = null;
const dataPoints = [];
const timePoints = [];
let startTime = null;

onMounted(() => {
  if (!chartCanvas.value) return;

  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels: timePoints,
      datasets: [{
        label: 'Multiplier',
        data: dataPoints,
        borderColor: '#00ff00',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderWidth: 3,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 10,
          title: {
            display: true,
            text: 'Time (s)',
            color: '#fff'
          },
          ticks: {
            color: '#fff',
            stepSize: 10,
            callback: function(value) {
              return value.toFixed(0);
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          type: 'linear',
          beginAtZero: false,
          min: 1.0,
          max: 2.0,
          title: {
            display: true,
            text: 'Multiplier',
            color: '#fff'
          },
          ticks: {
            color: '#fff',
            stepSize: 0.2,
            callback: function(value) {
              return value.toFixed(1) + 'x';
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      }
    }
  });
});

// Watch for state changes
watch(() => props.state, (newState) => {
  if (newState === 'RUNNING') {
    // Reset data when round starts
    dataPoints.length = 0;
    timePoints.length = 0;
    startTime = Date.now();

    // Reset axes to minimum range
    if (chart) {
      chart.options.scales.x.min = 0;
      chart.options.scales.x.max = 10;
      chart.options.scales.y.min = 1.0;
      chart.options.scales.y.max = 2.0;
    }
  } else if (newState === 'CRASHED') {
    // Turn line red when crashed
    if (chart) {
      chart.data.datasets[0].borderColor = '#ff0000';
      chart.update('none');
    }
  } else if (newState === 'BETTING') {
    // Reset to green for next round
    if (chart) {
      chart.data.datasets[0].borderColor = '#00ff00';
      dataPoints.length = 0;
      timePoints.length = 0;

      // Reset axes to minimum range
      chart.options.scales.x.min = 0;
      chart.options.scales.x.max = 10;
      chart.options.scales.y.min = 1.0;
      chart.options.scales.y.max = 2.0;

      chart.update('none');
    }
  }
});

// Watch for multiplier updates
watch(() => props.currentMultiplier, (newMultiplier) => {
  if (props.state === 'RUNNING' && chart && startTime) {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    // Add new data point
    timePoints.push(elapsedSeconds);
    dataPoints.push(newMultiplier);

    // Dynamically adjust X-axis range
    // Always start from 0, minimum 10 seconds, continuously update as time grows
    const currentMaxX = chart.options.scales.x.max;
    if (elapsedSeconds > currentMaxX * 0.8) {
      // Continuously expand X-axis to keep current time at ~80% of range
      // Add some padding (20%) ahead of current time
      chart.options.scales.x.max = Math.max(currentMaxX, elapsedSeconds * 1.2);
    }

    // Dynamically adjust Y-axis range
    // Start at 1.0-2.0, continuously update max as multiplier grows
    const currentMaxY = chart.options.scales.y.max;
    if (newMultiplier > currentMaxY * 0.8) {
      // Continuously expand Y-axis to keep current multiplier at ~80% of range
      // Add some padding (20%) above current multiplier
      chart.options.scales.y.max = Math.max(currentMaxY, newMultiplier * 1.2);
    }

    // Keep all data points to show complete history from time 0
    // Note: For very long games, consider increasing the limit or implementing
    // a more sophisticated data management strategy

    // Update chart
    chart.update('none'); // 'none' mode = no animation for better performance
  }
});

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy();
  }
});
</script>

<style scoped>
.game-graph {
  position: relative;
  width: 100%;
  height: 400px;
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
}

canvas {
  width: 100% !important;
  height: 100% !important;
}

.crash-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 0, 0.8);
  color: white;
  padding: 20px 40px;
  border-radius: 8px;
  font-size: 24px;
  font-weight: bold;
  z-index: 10;
  pointer-events: none;
}
</style>
