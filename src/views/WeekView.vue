<script setup lang="ts">
import { computed, ref } from 'vue'
import { isSameDay } from 'date-fns'
import { useCalendar } from '../composables/useCalendar'
import { useSwipeNavigation } from '../composables/useSwipe'
import { generateWeekGrid } from '../core/calendar/engine'
import { getHolidayData } from '../core/holiday/data'
import { DayType } from '../core/holiday/types'
import type { DateCell } from '../core/calendar/types'
import { useEventsStore } from '../stores/eventsStore'
import { dateToKey, layoutTimeBlocks } from '../core/events/engine'
import type { EventOccurrence, TimeBlockLayout } from '../core/events/types'
import type { FestivalCategory } from '../core/holiday/types'

const { store } = useCalendar()
const eventsStore = useEventsStore()
const today = new Date()

const root = ref<HTMLElement | null>(null)
useSwipeNavigation(root, (dir) => {
  if (dir === 'left') store.goNext()
  else store.goPrev()
})

const grid = computed(() => {
  const d = store.currentDate
  return generateWeekGrid(d, getHolidayData(d.getFullYear()), store.weekStartsOn, store.enabledCategories)
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

/** 是否有全天事件（决定全天行是否渲染） */
const anyAllDay = computed(() =>
  grid.value.days.some((d) =>
    eventsStore.getEventsForDate(dateToKey(d.date)).some((o) => o.event.allDay),
  ),
)

function alldayOccs(day: DateCell): EventOccurrence[] {
  return eventsStore.getEventsForDate(dateToKey(day.date)).filter((o) => o.event.allDay)
}

function layout(day: DateCell): TimeBlockLayout[] {
  return layoutTimeBlocks(eventsStore.getEventsForDate(dateToKey(day.date)))
}

function evtStyle(b: TimeBlockLayout) {
  return {
    top: `${b.topPercent}%`,
    height: `${b.heightPercent}%`,
    left: b.laneCount > 1 ? `calc(${(b.laneIndex / b.laneCount) * 100}% + 1px)` : '1px',
    width: b.laneCount > 1 ? `calc(${100 / b.laneCount}% - 2px)` : 'calc(100% - 2px)',
  }
}

/** 分类配色修饰类（数字与 chip 共用）：wv__num--cat-* / wv__holiday--cat-* */
function catClass(prefix: string, category: FestivalCategory | undefined): string {
  return category ? `${prefix}--cat-${category}` : ''
}

/** 点击空白创建：按点击位置推算小时，选中该日并打开创建对话框 */
function onAreaClick(day: DateCell, e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const hour = Math.min(23, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * 24)))
  store.goToDate(day.date)
  eventsStore.openCreate(dateToKey(day.date), `${String(hour).padStart(2, '0')}:00`)
}

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
  <div ref="root" class="wv" tabindex="0" @keydown="onKeydown">
    <div class="wv__grid">
      <!-- 时间列 -->
      <div class="wv__time-col">
        <div class="wv__corner" />
        <div v-if="anyAllDay" class="wv__allday-spacer" />
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
              :class="[
                catClass('wv__num', day.holidayCategory),
                {
                  'wv__num--today': isSameDay(day.date, today),
                  'wv__num--holiday': day.dayType === DayType.Holiday,
                },
              ]"
            >{{ day.date.getDate() }}</span>
            <span v-if="day.holidayName" :class="['wv__holiday', catClass('wv__holiday', day.holidayCategory)]">{{ day.holidayName }}</span>
            <span v-else-if="day.dayType === DayType.AdjustedWorkday" class="wv__holiday wv__holiday--adj">班</span>
          </div>
          <div v-if="anyAllDay" class="wv__allday">
            <div
              v-for="occ in alldayOccs(day)"
              :key="occ.event.id"
              class="wv__chip"
              @click.stop="eventsStore.openEdit(occ.event.id)"
            >{{ occ.event.title }}</div>
          </div>
          <div class="wv__time-area" @click="onAreaClick(day, $event)">
            <div
              v-for="h in hours"
              :key="h"
              class="wv__cell"
              :class="{ 'wv__cell--now': isSameDay(day.date, today) && h === today.getHours() }"
            />
            <div
              v-for="b in layout(day)"
              :key="b.occurrence.event.id"
              class="wv__evt"
              :style="evtStyle(b)"
              @click.stop="eventsStore.openEdit(b.occurrence.event.id)"
            >{{ b.occurrence.event.startTime }} {{ b.occurrence.event.title }}</div>
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
  touch-action: pan-y;
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
  color: var(--app-festival-statutory);
}
.wv__num--cat-traditional { color: var(--app-festival-traditional); }
.wv__num--cat-western { color: var(--app-festival-western); }

.wv__holiday {
  font: var(--md-sys-typescale-label-small);
  color: var(--app-festival-statutory);
  white-space: nowrap;
}
.wv__holiday--cat-traditional { color: var(--app-festival-traditional); }
.wv__holiday--cat-western { color: var(--app-festival-western); }
.wv__holiday--adj {
  color: var(--md-sys-color-tertiary);
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  border-radius: var(--md-sys-shape-corner-full);
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

/* ── 全天事件行 ── */
.wv__allday-spacer {
  height: 28px;
}
.wv__allday {
  height: 28px;
  display: flex;
  gap: 2px;
  padding: 2px 4px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  overflow: hidden;
}
.wv__chip {
  flex-shrink: 1;
  min-width: 0;
  font: var(--md-sys-typescale-label-small);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-radius: var(--md-sys-shape-corner-sm);
  padding: 1px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

/* ── 时间段事件层 ── */
.wv__time-area {
  position: relative;
}
.wv__evt {
  position: absolute;
  z-index: 1;
  font: var(--md-sys-typescale-label-small);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-radius: var(--md-sys-shape-corner-xs);
  padding: 2px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

/* ── 底部范围条 ── */
.wv__range {
  padding: 8px 16px;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  font: var(--md-sys-typescale-label-medium);
  color: var(--md-sys-color-on-surface-variant);
}
</style>
