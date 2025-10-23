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
          title: {
            display: true,
            text: 'Time (s)',
            color: '#fff'
          },
          ticks: {
            color: '#fff'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          type: 'linear',
          beginAtZero: false,
          min: 1.0,
          title: {
            display: true,
            text: 'Multiplier',
            color: '#fff'
          },
          ticks: {
            color: '#fff',
            callback: function(value) {
              return value.toFixed(2) + 'x';
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
    
    // Limit data points to last 200 for performance
    if (dataPoints.length > 200) {
      dataPoints.shift();
      timePoints.shift();
    }
    
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
