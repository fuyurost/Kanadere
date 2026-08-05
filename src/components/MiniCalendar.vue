<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isSameDay } from 'date-fns'
import { DayType } from '../core/holiday/types'
import { useMiniCalendar } from '../composables/useCalendar'
import { useCalendarStore } from '../stores/calendarStore'

const props = defineProps<{
  weekStartsOn: 0 | 1
}>()

const store = useCalendarStore()
const today = new Date()

const miniDate = ref(new Date())
const miniYear = computed(() => miniDate.value.getFullYear())
const miniMonth = computed(() => miniDate.value.getMonth() + 1)

const grid = computed(() => useMiniCalendar(miniYear.value, miniMonth.value, props.weekStartsOn))

const weekLabels = computed(() =>
  props.weekStartsOn === 0
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['一', '二', '三', '四', '五', '六', '日'],
)

function prevMonth() {
  const d = miniDate.value
  miniDate.value = new Date(d.getFullYear(), d.getMonth() - 1, 1)
}
function nextMonth() {
  const d = miniDate.value
  miniDate.value = new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

// 主视图月份变化时，mini 日历跟随（用户手动翻 mini 时不受影响）
watch(
  () => store.currentDate.getFullYear(),
  (y) => { miniDate.value = new Date(y, miniDate.value.getMonth(), 1) },
)
watch(
  () => store.currentDate.getMonth(),
  (m) => { miniDate.value = new Date(miniDate.value.getFullYear(), m, 1) },
)

function pickDate(date: Date) {
  store.goToDate(date)
}
</script>

<template>
  <div class="mini-cal">
    <div class="mini-cal__head">
      <button class="mini-cal__nav" @click="prevMonth">&#8249;</button>
      <span class="mini-cal__label">{{ miniYear }}年{{ miniMonth }}月</span>
      <button class="mini-cal__nav" @click="nextMonth">&#8250;</button>
    </div>
    <div class="mini-cal__weekdays">
      <span v-for="l in weekLabels" :key="l" class="mini-cal__wd">{{ l }}</span>
    </div>
    <div class="mini-cal__grid">
      <div
        v-for="(cell, i) in grid.cells"
        :key="i"
        class="mini-cal__cell"
        :class="{
          'mini-cal__cell--today': isSameDay(cell.date, today) && cell.isCurrentMonth,
          'mini-cal__cell--selected':
            store.selectedDate != null && isSameDay(cell.date, store.selectedDate),
          'mini-cal__cell--holiday': cell.dayType === DayType.Holiday && cell.isCurrentMonth,
          'mini-cal__cell--dim': !cell.isCurrentMonth,
        }"
        @click="pickDate(cell.date)"
      >
        {{ cell.date.getDate() }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.mini-cal {
  width: 100%;
}

.mini-cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
  margin-bottom: 6px;
}

.mini-cal__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--md-sys-shape-corner-full);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 18px;
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.mini-cal__nav:hover {
  background: rgba(128, 128, 128, 0.12);
}

.mini-cal__label {
  font: var(--md-sys-typescale-label-large);
  color: var(--md-sys-color-on-surface);
  cursor: default;
}

.mini-cal__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 2px;
}

.mini-cal__wd {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  padding: 2px 0;
}

.mini-cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.mini-cal__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface);
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  transition:
    background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.mini-cal__cell:hover {
  background: rgba(128, 128, 128, 0.10);
}

.mini-cal__cell--today {
  color: var(--md-sys-color-on-primary);
  background: var(--md-sys-color-primary);
}

.mini-cal__cell--selected:not(.mini-cal__cell--today) {
  color: var(--md-sys-color-primary);
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
}

.mini-cal__cell--holiday {
  color: var(--md-sys-color-error);
}
.mini-cal__cell--holiday.mini-cal__cell--today {
  color: var(--md-sys-color-on-error);
  background: var(--md-sys-color-error);
}

.mini-cal__cell--dim {
  color: var(--md-sys-color-on-surface);
  opacity: 0.28;
  cursor: default;
}
</style>
