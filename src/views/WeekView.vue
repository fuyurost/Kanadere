<script setup lang="ts">
import { computed } from 'vue'
import { isSameDay } from 'date-fns'
import { useCalendar } from '../composables/useCalendar'
import { generateWeekGrid } from '../core/calendar/engine'
import { getHolidayData } from '../core/holiday/data'
import { DayType } from '../core/holiday/types'

const { store } = useCalendar()
const today = new Date()

const grid = computed(() => {
  const d = store.currentDate
  return generateWeekGrid(d, getHolidayData(d.getFullYear()), store.weekStartsOn)
})

/** 周范围标题，如 2026年8月3日 – 9日 或跨月 1月27日 – 2月2日 */
const rangeLabel = computed(() => {
  const days = grid.value.days
  const first = days[0]!.date
  const last = days[6]!.date
  const y = first.getFullYear()
  if (first.getMonth() === last.getMonth()) {
    return `${y}年${first.getMonth() + 1}月${first.getDate()}日 – ${last.getDate()}日`
  }
  return `${y}年${first.getMonth() + 1}月${first.getDate()}日 – ${last.getMonth() + 1}月${last.getDate()}日`
})

const weekdayLabels = computed<string[]>(() =>
  store.weekStartsOn === 0
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['一', '二', '三', '四', '五', '六', '日'],
)

const weekendCols = computed<Set<number>>(() =>
  store.weekStartsOn === 0 ? new Set([0, 6]) : new Set([5, 6]),
)

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
  <div class="wv" tabindex="0" @keydown="onKeydown">
    <div class="wv__grid">
      <!-- 时间列 -->
      <div class="wv__time-col">
        <div class="wv__corner" />
        <div
          v-for="h in hours"
          :key="h"
          class="wv__time"
          :class="{ 'wv__time--now': h === today.getHours() }"
        >{{ h }}:00</div>
      </div>

      <!-- 7 天列 -->
      <div class="wv__days">
        <div
          v-for="(day, ci) in grid.days"
          :key="day.date.getTime()"
          class="wv__day-col"
          :class="{ 'wv__day-col--weekend': weekendCols.has(ci) }"
        >
          <div class="wv__day-head">
            <span class="wv__wd">{{ weekdayLabels[ci] }}</span>
            <span
              class="wv__num"
              :class="{
                'wv__num--today': isSameDay(day.date, today),
                'wv__num--holiday': day.dayType === DayType.Holiday,
              }"
            >{{ day.date.getDate() }}</span>
            <span v-if="day.holidayName" class="wv__holiday">{{ day.holidayName }}</span>
            <span v-else-if="day.dayType === DayType.AdjustedWorkday" class="wv__holiday wv__holiday--adj">班</span>
          </div>
          <div
            v-for="h in hours"
            :key="h"
            class="wv__cell"
            :class="{ 'wv__cell--now': isSameDay(day.date, today) && h === today.getHours() }"
          >
            <!-- 事件占位：Phase 3 -->
          </div>
        </div>
      </div>
    </div>

    <div class="wv__range">{{ rangeLabel }}</div>
  </div>
</template>

<style scoped>
.wv {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  outline: none;
  background: var(--md-sys-color-surface);
  overflow: hidden;
}

.wv__grid {
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

/* ── 时间列 ── */
.wv__corner {
  height: 64px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.wv__time {
  height: 48px;
  padding-right: 8px;
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  text-align: right;
  transform: translateY(-8px);
}

.wv__time--now {
  color: var(--md-sys-color-primary);
  font-weight: 600;
}

/* ── 天列 ── */
.wv__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.wv__day-col {
  border-left: 1px solid var(--md-sys-color-outline-variant);
}

.wv__day-col--weekend {
  background: var(--md-sys-color-surface-container-lowest);
}

.wv__day-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  height: 64px;
  padding: 8px 4px;
  background: var(--md-sys-color-surface);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.wv__wd {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
}

.wv__num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--md-sys-shape-corner-full);
  font: var(--md-sys-typescale-label-large);
  color: var(--md-sys-color-on-surface);
}

.wv__num--today {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.wv__num--holiday {
  color: var(--md-sys-color-error);
}

.wv__holiday {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-error);
  white-space: nowrap;
}

.wv__holiday--adj {
  color: var(--md-sys-color-tertiary);
}

.wv__cell {
  position: relative;
  height: 48px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.wv__cell--now {
  background: var(--md-sys-color-primary-container);
  opacity: 0.35;
}

/* ── 底部范围条 ── */
.wv__range {
  padding: 8px 16px;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  font: var(--md-sys-typescale-label-medium);
  color: var(--md-sys-color-on-surface-variant);
}
</style>
