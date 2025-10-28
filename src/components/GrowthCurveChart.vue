<template>
  <div class="growth-curve-chart">
    <div class="chart-title">Growth Curve Visualization (100x Target)</div>
    <div ref="chartContainer" class="chart-container"></div>
    <div v-if="timeToHundredX !== null" class="time-marker">
      到達 100x: {{ timeToHundredX.toFixed(1) }} 秒
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useGrowthRateConfig } from '@/composables/useGrowthRateConfig';
import { calculateCurrentMultiplier, timeToReachMultiplier } from '@/utils/crashFormula';

const { rates } = useGrowthRateConfig();

const chartContainer = ref(null);
let chart = null;
const timeToHundredX = ref(null);

// 生成曲線數據
function generateCurveData(growthRates, maxTime = 60) {
  const timeData = [];
  const multiplierData = [];
  const step = 100; // 每100ms一個數據點

  let reached100x = false;

  for (let ms = 0; ms <= maxTime * 1000; ms += step) {
    const mult = calculateCurrentMultiplier(ms);
    const time = ms / 1000;

    timeData.push(time);
    multiplierData.push(mult);

    // 記錄到達100x的時間
    if (!reached100x && mult >= 100) {
      timeToHundredX.value = timeToReachMultiplier(100, growthRates) / 1000;
      reached100x = true;
    }

    // 如果已達到100x，停止生成
    if (mult >= 100) {
      break;
    }
  }

  // 如果沒有達到100x，設為null
  if (!reached100x) {
    timeToHundredX.value = null;
  }

  return { timeData, multiplierData };
}

// 創建階段背景插件
function createPhaseBackgrounds() {
  return {
    hooks: {
      drawClear: [
        (u) => {
          const { ctx } = u;
          const { width, height, top, left } = u.bbox;

          // 計算階段邊界在畫布上的像素位置
          const phase1End = u.valToPos(10, 'x', true);
          const phase2End = u.valToPos(25, 'x', true);

          ctx.save();

          // Phase 1 背景 (0-10s) - 淺藍色
          ctx.fillStyle = 'rgba(74, 144, 226, 0.08)';
          ctx.fillRect(left, top, phase1End - left, height);

          // Phase 2 背景 (10-25s) - 淺綠色
          if (phase2End > phase1End) {
            ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
            ctx.fillRect(phase1End, top, phase2End - phase1End, height);
          }

          // Phase 3 背景 (25s+) - 淺橙色
          if (width + left > phase2End) {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.08)';
            ctx.fillRect(phase2End, top, width + left - phase2End, height);
          }

          // 繪製100x水平線
          const y100 = u.valToPos(100, 'y', true);
          if (y100 >= top && y100 <= top + height) {
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(left, y100);
            ctx.lineTo(left + width, y100);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.restore();
        }
      ]
    }
  };
}

// 初始化圖表
function initChart() {
  if (!chartContainer.value) return;

  const { timeData, multiplierData } = generateCurveData(rates);

  const maxTime = Math.max(...timeData, 60);
  const maxMult = Math.max(...multiplierData, 100);

  const opts = {
    width: chartContainer.value.offsetWidth,
    height: 280,
    series: [
      {
        label: 'Time (s)'
      },
      {
        label: 'Multiplier',
        stroke: '#00ff88',
        width: 2,
        points: {
          show: false
        }
      }
    ],
    axes: [
      {
        stroke: '#fff',
        grid: {
          show: true,
          stroke: 'rgba(255, 255, 255, 0.1)',
          width: 1,
        },
        ticks: {
          stroke: 'rgba(255, 255, 255, 0.3)',
        },
      },
      {
        stroke: '#fff',
        grid: {
          stroke: 'rgba(255, 255, 255, 0.1)',
          width: 1,
        },
        ticks: {
          stroke: 'rgba(255, 255, 255, 0.3)',
        },
      }
    ],
    scales: {
      x: {
        time: false,
        auto: false,
        range: [0, maxTime]
      },
      y: {
        auto: false,
        range: [1.0, maxMult * 1.1]
      }
    },
    padding: [10, 10, 0, 0],
    plugins: [
      createPhaseBackgrounds()
    ]
  };

  chart = new uPlot(opts, [timeData, multiplierData], chartContainer.value);

  // 監聽視窗大小變化
  const resizeObserver = new ResizeObserver(() => {
    if (chart && chartContainer.value) {
      chart.setSize({
        width: chartContainer.value.offsetWidth,
        height: 280
      });
    }
  });
  resizeObserver.observe(chartContainer.value);
}

// 更新圖表數據
function updateChart() {
  if (!chart) return;

  const { timeData, multiplierData } = generateCurveData(rates);
  const maxTime = Math.max(...timeData, 60);
  const maxMult = Math.max(...multiplierData, 100);

  chart.setData([timeData, multiplierData]);
  chart.setScale('x', {
    min: 0,
    max: maxTime
  });
  chart.setScale('y', {
    min: 1.0,
    max: maxMult * 1.1
  });
}

onMounted(() => {
  initChart();
});

// 監聽成長率變化
watch(
  () => rates,
  () => {
    updateChart();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy();
  }
});
</script>

<style scoped>
.growth-curve-chart {
  position: relative;
  width: 100%;
  height: 340px;
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.chart-title {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
  text-align: center;
}

.chart-container {
  width: 100%;
  height: 280px;
}

/* uPlot 深色主題樣式覆蓋 */
.growth-curve-chart :deep(.u-wrap) {
  background: transparent;
}

.growth-curve-chart :deep(.u-legend) {
  display: none;
}

.growth-curve-chart :deep(.u-axis) {
  color: #fff;
}

.time-marker {
  position: absolute;
  top: 50px;
  right: 30px;
  background: rgba(255, 165, 0, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  z-index: 10;
  pointer-events: none;
}
</style>
