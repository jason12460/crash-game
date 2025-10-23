<template>
  <div class="balance-display" :class="{ 'low-balance': isLowBalance }">
    <div class="balance-label">Balance</div>
    <div class="balance-amount">{{ formattedBalance }}</div>
    <div v-if="isLowBalance" class="low-balance-warning">
      Low balance! Minimum bet is $1.00
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatCurrency } from '../utils/currency.js';

const props = defineProps({
  balanceCents: {
    type: Number,
    required: true
  }
});

const formattedBalance = computed(() => {
  return formatCurrency(props.balanceCents);
});

const isLowBalance = computed(() => {
  return props.balanceCents < 100; // Less than minimum bet
});
</script>

<style scoped>
.balance-display {
  background: rgba(0, 0, 0, 0.3);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s ease;
}

.balance-label {
  font-size: 14px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 32px;
  font-weight: bold;
  color: #00ff00;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
}

.low-balance .balance-amount {
  color: #ff9900;
}

.low-balance-warning {
  margin-top: 8px;
  font-size: 12px;
  color: #ff9900;
}
</style>
