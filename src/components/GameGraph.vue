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
let lineColor = '#00ff00';  // 線條顏色狀態

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
        stroke: () => lineColor,  // 使用函數動態返回顏色
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
  console.log('狀態變化:', newState);

  if (newState === 'RUNNING') {
    console.log('開始新一輪遊戲');
    // Reset data when round starts
    startTime = Date.now();
    // 添加初始點 (0, 1.0)
    timeData = [0];
    multiplierData = [1.0];
    currentXRange = [0, 10];
    currentYRange = [1.0, 2.0];
    lineColor = '#00ff00';  // 設置為綠色

    if (chart) {
      // 設置初始數據點 (0, 1.0)
      chart.setData([[0], [1.0]]);

      // 重置坐標軸
      chart.setScale('x', {
        min: 0,
        max: 10
      });
      chart.setScale('y', {
        min: 1.0,
        max: 2.0
      });

      console.log('圖表已重置,初始數據已設置');
    }
  } else if (newState === 'CRASHED') {
    console.log('遊戲崩潰');
    // Turn line red when crashed
    lineColor = '#ff0000';  // 設置為紅色
    if (chart) {
      // 強制重繪以更新顏色
      chart.setData([timeData, multiplierData]);
    }
  } else if (newState === 'BETTING') {
    console.log('進入下注階段');
    // Reset to green for next round
    if (chart) {
      // 重置數據和坐標軸範圍
      timeData = [];
      multiplierData = [];
      currentXRange = [0, 10];
      currentYRange = [1.0, 2.0];

      // 清空數據
      chart.setData([[], []]);

      // 重置 X 和 Y 軸範圍
      chart.setScale('x', {
        min: 0,
        max: 10
      });
      chart.setScale('y', {
        min: 1.0,
        max: 2.0
      });

      console.log('圖表已清空');
    }
  }
});

// Watch for multiplier updates
watch(() => props.currentMultiplier, (newMultiplier) => {
  if (props.state === 'RUNNING' && chart && startTime) {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    // 只在時間 > 0 時添加新數據點（第一個點 (0, 1.0) 已經在 RUNNING 狀態時添加）
    if (elapsedSeconds > 0) {
      //console.log('添加數據點:', elapsedSeconds.toFixed(2), 's', newMultiplier.toFixed(2) + 'x', '數據長度:', timeData.length);
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
      //console.log('Y軸範圍更新:', currentYRange, '當前倍率:', newMultiplier);

      // 使用 setScale 來更新 Y 軸範圍
      chart.setScale('y', {
        min: 1.0,
        max: newMaxY
      });
      }
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
