<template>
  <div class="growth-curve-chart">
    <div class="chart-title">Growth Curve Visualization (100x Target)</div>
    <div ref="chartContainer" class="chart-container"></div>
    <div v-if="timeToHundredX !== null" class="time-marker">
      到達 100x: {{ timeToHundredX.toFixed(1) }} 秒
    </div>
    <!-- Tooltip -->
    <div ref="tooltip" class="chart-tooltip" v-show="tooltipVisible">
      <div class="tooltip-content">
        {{ tooltipContent }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useGrowthRateConfig } from '@/composables/useGrowthRateConfig';
import { calculateCurrentMultiplier, timeToReachMultiplier } from '@/utils/crashFormula';

const { phases } = useGrowthRateConfig();

const chartContainer = ref(null);
const tooltip = ref(null);
let chart = null;
const timeToHundredX = ref(null);
const tooltipVisible = ref(false);
const tooltipContent = ref('');

// 生成曲線數據
function generateCurveData(maxTime = 60) {
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
      timeToHundredX.value = timeToReachMultiplier(100, phases) / 1000;
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

// 創建階段背景插件 - 支持動態 N 個階段
function createPhaseBackgrounds() {
  // 定義顏色循環（最多10個階段）
  const phaseColors = [
    'rgba(74, 144, 226, 0.08)',   // 藍色
    'rgba(0, 255, 136, 0.08)',    // 綠色
    'rgba(255, 165, 0, 0.08)',    // 橙色
    'rgba(255, 100, 255, 0.08)',  // 紫色
    'rgba(255, 255, 0, 0.08)',    // 黃色
    'rgba(0, 255, 255, 0.08)',    // 青色
    'rgba(255, 50, 50, 0.08)',    // 紅色
    'rgba(100, 255, 100, 0.08)',  // 淺綠
    'rgba(200, 150, 255, 0.08)',  // 淡紫
    'rgba(255, 200, 100, 0.08)'   // 淡橙
  ];

  return {
    hooks: {
      drawClear: [
        (u) => {
          const { ctx } = u;
          const { width, height, top, left } = u.bbox;

          ctx.save();

          // 獲取動態階段配置
          const { phases } = useGrowthRateConfig();

          let previousX = left;
          let previousEndTime = 0;

          // 繪製每個階段的背景
          phases.forEach((phase, index) => {
            const color = phaseColors[index % phaseColors.length];

            if (phase.endTime !== null) {
              // 有限階段：繪製從 previousX 到 endTime 的背景
              const endTimeSeconds = phase.endTime / 1000;
              const endX = u.valToPos(endTimeSeconds, 'x', true);

              if (endX > previousX) {
                ctx.fillStyle = color;
                ctx.fillRect(previousX, top, endX - previousX, height);
              }

              previousX = endX;
              previousEndTime = phase.endTime;
            } else {
              // 無限階段（最後一個）：繪製到畫布右邊界
              ctx.fillStyle = color;
              ctx.fillRect(previousX, top, width + left - previousX, height);
            }
          });

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

  const { timeData, multiplierData } = generateCurveData();

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
    cursor: {
      show: true,
      x: true,
      y: true,
      points: {
        show: false
      },
      drag: {
        x: false,
        y: false
      },
      sync: {
        key: 'growth-curve'
      }
    },
    padding: [10, 10, 0, 0],
    plugins: [
      createPhaseBackgrounds()
    ],
    hooks: {
      setCursor: [
        (u) => {
          const { left, top, idx } = u.cursor;

          if (idx === null || idx === undefined) {
            tooltipVisible.value = false;
            return;
          }

          const timeValue = u.data[0][idx];
          const multValue = u.data[1][idx];

          if (timeValue !== null && timeValue !== undefined &&
              multValue !== null && multValue !== undefined) {
            tooltipContent.value = `${timeValue.toFixed(1)}s | ${multValue.toFixed(2)}x`;
            tooltipVisible.value = true;

            if (tooltip.value) {
              const tooltipWidth = tooltip.value.offsetWidth;
              const tooltipHeight = tooltip.value.offsetHeight;
              const chartRect = chartContainer.value.getBoundingClientRect();

              // Calculate position relative to chart container
              let tooltipLeft = left + 10;
              let tooltipTop = top + 10;

              // Prevent tooltip from going off-screen horizontally
              if (tooltipLeft + tooltipWidth > u.width) {
                tooltipLeft = left - tooltipWidth - 10;
              }

              // Prevent tooltip from going off-screen vertically
              if (tooltipTop + tooltipHeight > u.height) {
                tooltipTop = top - tooltipHeight - 10;
              }

              tooltip.value.style.left = `${tooltipLeft}px`;
              tooltip.value.style.top = `${tooltipTop}px`;
            }
          } else {
            tooltipVisible.value = false;
          }
        }
      ]
    }
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

  const { timeData, multiplierData } = generateCurveData();
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

// 監聽階段配置變化（包括成長率、時間邊界、階段數量）
watch(
  () => phases,
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

.chart-tooltip {
  position: absolute;
  background: rgba(42, 42, 42, 0.95);
  border: 1px solid #00ff88;
  border-radius: 4px;
  padding: 8px 12px;
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.tooltip-content {
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
}
</style>
