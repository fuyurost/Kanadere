<script setup lang="ts">
import { computed } from 'vue'
import { isSameDay } from 'date-fns'
import { useCalendar } from '../composables/useCalendar'
import { generateDayCell } from '../core/calendar/engine'
import { getHolidayData } from '../core/holiday/data'
import { DayType } from '../core/holiday/types'

const { store } = useCalendar()
const today = new Date()

const day = computed(() => {
  const d = store.currentDate
  return generateDayCell(d, getHolidayData(d.getFullYear()))
})

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
const weekday = computed(() => weekdayNames[day.value.cell.date.getDay()]!)

const hours = Array.from({ length: 24 }, (_, h) => h)

function onKeydown(e: KeyboardEvent) {
  const map: Record<string, 'prevDay' | 'nextDay' | 'prevWeek' | 'nextWeek'> = {
    ArrowLeft:  'prevDay',
    ArrowRight: 'nextDay',
    ArrowUp:    'prevWeek',
    ArrowDown:  'nextWeek',
  }
  const dir = map[e.key]
  if (dir) {
    e.preventDefault()
    store.navigateSelection(dir)
  }
}
</script>

<template>
  <div class="dv" tabindex="0" @keydown="onKeydown">
    <header class="dv__head">
      <span
        class="dv__date"
        :class="{ 'dv__date--today': isSameDay(day.cell.date, today) }"
      >{{ day.cell.date.getMonth() + 1 }}月{{ day.cell.date.getDate() }}日</span>
      <span class="dv__weekday">星期{{ weekday }}</span>
      <span
        v-if="day.cell.dayType === DayType.Holiday"
        class="dv__tag dv__tag--holiday"
      >{{ day.cell.holidayName }}</span>
      <span
        v-else-if="day.cell.dayType === DayType.AdjustedWorkday"
        class="dv__tag dv__tag--adj"
      >调休上班</span>
    </header>

    <div class="dv__body">
      <div class="dv__time-col">
        <div
          v-for="h in hours"
          :key="h"
          class="dv__time"
          :class="{ 'dv__time--now': h === today.getHours() }"
        >{{ h }}:00</div>
      </div>
      <div class="dv__hours">
        <div
          v-for="h in hours"
          :key="h"
          class="dv__cell"
          :class="{ 'dv__cell--now': h === today.getHours() }"
        >
          <!-- 事件占位：Phase 3 -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dv {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  outline: none;
  background: var(--md-sys-color-surface);
  overflow: hidden;
}

/* ── 头部日期信息 ── */
.dv__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.dv__date {
  font: var(--md-sys-typescale-headline-small);
  color: var(--md-sys-color-on-surface);
}

.dv__date--today {
  color: var(--md-sys-color-primary);
}

.dv__weekday {
  font: var(--md-sys-typescale-body-large);
  color: var(--md-sys-color-on-surface-variant);
}

.dv__tag {
  font: var(--md-sys-typescale-label-medium);
  padding: 2px 10px;
  border-radius: var(--md-sys-shape-corner-full);
}

.dv__tag--holiday {
  color: var(--md-sys-color-on-error-container);
  background: var(--md-sys-color-error-container);
}

.dv__tag--adj {
  color: var(--md-sys-color-on-tertiary-container);
  background: var(--md-sys-color-tertiary-container);
}

/* ── 时间线 ── */
.dv__body {
  display: grid;
  grid-template-columns: 56px 1fr;
  flex: 1;
  min-height: 0;
  margin: 12px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-lg);
  overflow-y: auto;
  background: var(--md-sys-color-surface);
}

.dv__time {
  height: 48px;
  padding-right: 8px;
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  text-align: right;
  transform: translateY(-8px);
}

.dv__time--now {
  color: var(--md-sys-color-primary);
  font-weight: 600;
}

.dv__cell {
  height: 48px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  border-left: 1px solid var(--md-sys-color-outline-variant);
}

.dv__cell--now {
  background: var(--md-sys-color-primary-container);
  opacity: 0.35;
}
</style>
