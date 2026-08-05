<script setup lang="ts">
import { computed } from 'vue'
import { isSameDay } from 'date-fns'
import type { DateCell } from '../core/calendar/types'
import DateCellComponent from './DateCell.vue'

const props = defineProps<{
  cells: DateCell[]
  selectedDate: Date | null
  weekStartsOn: 0 | 1
}>()
defineEmits<{ select: [date: Date] }>()

const today = new Date()

const weekdayLabels = computed<string[]>(() =>
  props.weekStartsOn === 0
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['一', '二', '三', '四', '五', '六', '日'],
)

const weekendCols = computed<Set<number>>(() =>
  props.weekStartsOn === 0 ? new Set([0, 6]) : new Set([5, 6]),
)
</script>

<template>
  <div class="cg">
    <header class="cg__header">
      <span
        v-for="(label, i) in weekdayLabels"
        :key="label"
        class="cg__weekday"
        :class="{ 'cg__weekday--weekend': weekendCols.has(i) }"
      >{{ label }}</span>
    </header>
    <div class="cg__body">
      <DateCellComponent
        v-for="(cell, i) in cells"
        :key="i"
        :cell="cell"
        :is-today="isSameDay(cell.date, today)"
        :is-selected="props.selectedDate != null && isSameDay(cell.date, props.selectedDate)"
        :is-weekend-col="weekendCols.has(i % 7)"
        @select="(date) => $emit('select', date)"
      />
    </div>
  </div>
</template>

<style scoped>
.cg {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  margin: 12px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-lg);
  overflow: hidden;
  background: var(--md-sys-color-surface);
}

.cg__header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.cg__weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  font: var(--md-sys-typescale-label-medium);
  color: var(--md-sys-color-on-surface);
}

.cg__weekday--weekend {
  color: var(--md-sys-color-on-surface-variant);
}

.cg__body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
}
</style>
