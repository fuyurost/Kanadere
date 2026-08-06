<script setup lang="ts">
import { computed, ref } from 'vue'
import { isSameDay } from 'date-fns'
import { useCalendar } from '../composables/useCalendar'
import { useSwipeNavigation } from '../composables/useSwipe'
import { generateDayCell } from '../core/calendar/engine'
import { getHolidayData } from '../core/holiday/data'
import { DayType, FestivalCategory } from '../core/holiday/types'
import type { FestivalCategory as FestivalCategoryType } from '../core/holiday/types'
import { useEventsStore } from '../stores/eventsStore'
import { dateToKey, layoutTimeBlocks } from '../core/events/engine'
import type { TimeBlockLayout } from '../core/events/types'
import { getLunarSubLabel } from '../core/lunar/lunar'

const { store } = useCalendar()
const eventsStore = useEventsStore()
const today = new Date()

const root = ref<HTMLElement | null>(null)
useSwipeNavigation(root, (dir) => {
  if (dir === 'left') store.goNext()
  else store.goPrev()
})

const day = computed(() => {
  const d = store.currentDate
  return generateDayCell(d, getHolidayData(d.getFullYear()), store.enabledCategories)
})

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
const weekday = computed(() => weekdayNames[day.value.cell.date.getDay()]!)

/** 农历/节气子标签（节气优先） */
const subLabel = computed(() => getLunarSubLabel(day.value.cell.date))

/** 分类配色修饰类：dv__tag--cat-traditional|western（法定用基础 dv__tag--holiday） */
function tagCatClass(category: FestivalCategoryType | undefined): string {
  return category === FestivalCategory.Traditional || category === FestivalCategory.Western
    ? `dv__tag--cat-${category}`
    : ''
}

const hours = Array.from({ length: 24 }, (_, h) => h)

/** 是否有全天事件（决定全天条是否渲染） */
const anyAllDay = computed(() =>
  eventsStore.getEventsForDate(dateToKey(day.value.cell.date)).some((o) => o.event.allDay),
)
const alldayOccs = computed(() =>
  eventsStore.getEventsForDate(dateToKey(day.value.cell.date)).filter((o) => o.event.allDay),
)
const layout = computed<TimeBlockLayout[]>(() =>
  layoutTimeBlocks(eventsStore.getEventsForDate(dateToKey(day.value.cell.date))),
)

function evtStyle(b: TimeBlockLayout) {
  return {
    top: `${b.topPercent}%`,
    height: `${b.heightPercent}%`,
    left: b.laneCount > 1 ? `calc(${(b.laneIndex / b.laneCount) * 100}% + 1px)` : '1px',
    width: b.laneCount > 1 ? `calc(${100 / b.laneCount}% - 2px)` : 'calc(100% - 2px)',
  }
}

/** 点击空白创建：按点击位置推算小时（日视图当前日期即 currentDate，无需跳转） */
function onAreaClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const hour = Math.min(23, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * 24)))
  eventsStore.openCreate(dateToKey(day.value.cell.date), `${String(hour).padStart(2, '0')}:00`)
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
  <div ref="root" class="dv" tabindex="0" @keydown="onKeydown">
    <header class="dv__head">
      <span
        class="dv__date"
        :class="{ 'dv__date--today': isSameDay(day.cell.date, today) }"
      >{{ day.cell.date.getMonth() + 1 }}月{{ day.cell.date.getDate() }}日</span>
      <span class="dv__weekday">星期{{ weekday }}</span>
      <span
        v-if="day.cell.dayType === DayType.Holiday"
        :class="['dv__tag', 'dv__tag--holiday', tagCatClass(day.cell.holidayCategory)]"
      >{{ day.cell.holidayName }}</span>
      <span
        v-else-if="day.cell.dayType === DayType.AdjustedWorkday"
        class="dv__tag dv__tag--adj"
      >调休上班</span>
      <span v-if="subLabel" :class="['dv__sub', { 'dv__sub--term': subLabel.isTerm }]">{{ subLabel.text }}</span>
    </header>

    <div v-if="anyAllDay" class="dv__allday">
      <div
        v-for="occ in alldayOccs"
        :key="occ.event.id"
        class="dv__chip"
        @click.stop="eventsStore.openEdit(occ.event.id)"
      >{{ occ.event.title }}</div>
    </div>

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
        <div class="dv__time-area" @click="onAreaClick">
          <div
            v-for="h in hours"
            :key="h"
            class="dv__cell"
            :class="{ 'dv__cell--now': h === today.getHours() }"
          />
          <div
            v-for="b in layout"
            :key="b.occurrence.event.id"
            class="dv__evt"
            :style="evtStyle(b)"
            @click.stop="eventsStore.openEdit(b.occurrence.event.id)"
          >{{ b.occurrence.event.startTime }} {{ b.occurrence.event.title }}</div>
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
  touch-action: pan-y;
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

/* 分类标签：实心 pill（背景 = 类别别名色，前景 = 派生 -fg），与调休 inverse pill 风格统一 */
.dv__tag--holiday {
  color: var(--app-festival-statutory-fg);
  background: var(--app-festival-statutory);
}
.dv__tag--cat-traditional {
  color: var(--app-festival-traditional-fg);
  background: var(--app-festival-traditional);
}
.dv__tag--cat-western {
  color: var(--app-festival-western-fg);
  background: var(--app-festival-western);
}

.dv__tag--adj {
  color: var(--md-sys-color-on-tertiary-container);
  background: var(--md-sys-color-tertiary-container);
}

/* ── 农历/节气子标签（节气高亮、农历弱化）── */
.dv__sub {
  font: var(--md-sys-typescale-body-medium);
  color: var(--md-sys-color-on-surface-variant);
}
.dv__sub--term {
  color: var(--md-sys-color-tertiary);
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

/* ── 全天事件条（在 body 外，不破坏时间列对齐）── */
.dv__allday {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2px 4px;
  min-height: 28px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  margin: 12px 12px 0;
}
.dv__chip {
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
.dv__time-area {
  position: relative;
}
.dv__evt {
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
</style>
