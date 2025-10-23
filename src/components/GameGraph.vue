<template>
  <div class="game-graph">
    <div ref="chartContainer" class="chart-container"></div>
    <div v-if="state === 'CRASHED'" class="crash-marker">
      CRASHED AT {{ crashPoint.toFixed(2) }}x
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

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

const chartContainer = ref(null);
let chart = null;
let timeData = [];
let multiplierData = [];
let startTime = null;
let currentXRange = [0, 10];
let currentYRange = [1.0, 2.0];

onMounted(() => {
  if (!chartContainer.value) return;

  const opts = {
    width: chartContainer.value.offsetWidth,
    height: 400,
    series: [
      {
        label: 'Time (s)'
      },
      {
        label: 'Multiplier',
        stroke: '#00ff00',
        width: 3,
        points: {
          show: false  // 不顯示數據點，只畫線
        }
      }
    ],
    axes: [
      {
        stroke: '#fff',
        grid: {
          show: false,  // 禁用 X 軸網格線
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
        range: (u, dataMin, dataMax) => currentXRange,
      },
      y: {
        auto: false,
        range: [1.0, 2.0],
      }
    },
    padding: [10, 10, 0, 0],
  };

  // 初始化空數據
  const data = [
    [],  // x 軸（時間）
    [],  // y 軸（倍率）
  ];

  chart = new uPlot(opts, data, chartContainer.value);

  // 監聽視窗大小變化
  const resizeObserver = new ResizeObserver(() => {
    if (chart && chartContainer.value) {
      chart.setSize({
        width: chartContainer.value.offsetWidth,
        height: 400
      });
    }
  });
  resizeObserver.observe(chartContainer.value);
});

// Watch for state changes
watch(() => props.state, (newState) => {
  if (newState === 'RUNNING') {
    // Reset data when round starts
    startTime = Date.now();
    timeData = [];
    multiplierData = [];
    currentXRange = [0, 10];
    currentYRange = [1.0, 2.0];

    if (chart) {
      // 清空數據
      chart.setData([[], []]);
    }
  } else if (newState === 'CRASHED') {
    // Turn line red when crashed
    if (chart) {
      chart.series[1].stroke = '#ff0000';
    }
  } else if (newState === 'BETTING') {
    // Reset to green for next round
    if (chart) {
      chart.series[1].stroke = '#00ff00';

      // 重置坐標軸範圍
      currentXRange = [0, 10];
      currentYRange = [1.0, 2.0];

      // 清空數據
      chart.setData([[], []]);
    }
  }
});

// Watch for multiplier updates
watch(() => props.currentMultiplier, (newMultiplier) => {
  if (props.state === 'RUNNING' && chart && startTime) {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    // 添加新數據點
    timeData.push(elapsedSeconds);
    multiplierData.push(newMultiplier);

    // 更新圖表數據
    chart.setData([timeData, multiplierData]);

    // 動態調整 X 軸範圍（必須在 setData 之後）
    const currentMaxX = currentXRange[1];
    if (elapsedSeconds > currentMaxX * 0.8) {
      const targetMax = elapsedSeconds * 1.2;
      const newMaxX = Math.max(currentMaxX, targetMax);
      currentXRange = [0, newMaxX];

      // 使用 setScale 來更新 X 軸範圍
      chart.setScale('x', {
        min: 0,
        max: newMaxX
      });
    }

    // 動態調整 Y 軸範圍（必須在 setData 之後）
    const currentMaxY = currentYRange[1];
    if (newMultiplier > currentMaxY * 0.8) {
      const targetMax = newMultiplier * 1.2;
      const newMaxY = Math.max(currentMaxY, targetMax);
      currentYRange = [1.0, newMaxY];
      console.log('Y軸範圍更新:', currentYRange, '當前倍率:', newMultiplier);

      // 使用 setScale 來更新 Y 軸範圍
      chart.setScale('y', {
        min: 1.0,
        max: newMaxY
      });
    }
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
  height: 440px;
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
}

.chart-container {
  width: 100%;
  height: 400px;
}

/* uPlot 深色主題樣式覆蓋 */
.game-graph :deep(.u-wrap) {
  background: transparent;
}

.game-graph :deep(.u-legend) {
  display: none;
}

.game-graph :deep(.u-axis) {
  color: #fff;
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
