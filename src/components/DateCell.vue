<script setup lang="ts">
import { computed } from 'vue'
import type { DateCell } from '../core/calendar/types'
import { DayType } from '../core/holiday/types'
import { useCalendarStore } from '../stores/calendarStore'
import { useEventsStore } from '../stores/eventsStore'
import { dateToKey } from '../core/events/engine'
import { getLunarSubLabel } from '../core/lunar/lunar'

const props = defineProps<{
  cell: DateCell
  isToday: boolean
  isSelected: boolean
  isWeekendCol?: boolean
}>()
const emit = defineEmits<{ select: [date: Date] }>()

const calendarStore = useCalendarStore()
const eventsStore = useEventsStore()

const occs = computed(() => eventsStore.getEventsForDate(dateToKey(props.cell.date)))

function onAdd() {
  calendarStore.selectDate(props.cell.date)
  eventsStore.openCreate(dateToKey(props.cell.date))
}

const cellState = computed(() => {
  const c = props.cell
  if (!c.isCurrentMonth) return 'muted'
  if (props.isSelected) return 'selected'
  if (c.dayType === DayType.Holiday) return props.isToday ? 'today-holiday' : 'holiday'
  if (c.dayType === DayType.AdjustedWorkday) return props.isToday ? 'today-adjusted' : 'adjusted'
  if (c.dayType === DayType.Weekend) return props.isToday ? 'today-weekend' : 'weekend'
  return props.isToday ? 'today' : 'default'
})

const label = computed(() => {
  if (props.cell.holidayName) return props.cell.holidayName
  if (props.cell.dayType === DayType.AdjustedWorkday) return '班'
  return null
})

/** 分类配色修饰类：dc--cat-statutory|traditional|western（无类别时不加） */
const catClass = computed(() =>
  props.cell.holidayCategory ? `dc--cat-${props.cell.holidayCategory}` : '',
)

/** 农历/节气子标签（仅当月显示） */
const subLabel = computed(() =>
  props.cell.isCurrentMonth ? getLunarSubLabel(props.cell.date) : null,
)
</script>

<template>
  <div
    :class="['dc', `dc--${cellState}`, catClass, { 'dc--wkcol': isWeekendCol && cell.isCurrentMonth && cellState !== 'selected' }]"
    @click="emit('select', cell.date)"
    @dblclick.stop="onAdd"
  >
    <div class="dc__top">
      <span :class="['dc__num', { 'dc__num--badge': isToday || isSelected }]">{{ cell.date.getDate() }}</span>
      <span v-if="subLabel" :class="['dc__sub', { 'dc__sub--term': subLabel.isTerm }]">{{ subLabel.text }}</span>
    </div>
    <button class="dc__add" aria-label="添加事件" @click.stop="onAdd">+</button>
    <span v-if="label" :class="['dc__label', { 'dc__label--holiday': cell.dayType === DayType.Holiday }]">{{ label }}</span>
    <div class="dc__events">
      <div
        v-for="occ in occs.slice(0, 2)"
        :key="occ.event.id"
        class="dc__chip"
        @click.stop="eventsStore.openEdit(occ.event.id)"
        @dblclick.stop
      >{{ occ.event.allDay ? occ.event.title : `${occ.event.startTime} ${occ.event.title}` }}</div>
      <div v-if="occs.length > 2" class="dc__more">+{{ occs.length - 2 }}</div>
    </div>
  </div>
</template>

<style scoped>
.dc {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 80px;
  min-width: 0; /* grid item 允许收缩，内容不撑开 1fr 列 */
  padding: 6px 6px 6px 4px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  cursor: pointer;
  user-select: none;
  transition: transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              background var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}
/* 平时方形网格（分隔线笔直）；涟漪出现期间圆角，扩散按圆角裁剪 */
.dc:has(.ripple__wave) {
  border-radius: var(--md-sys-shape-corner-sm);
}
.dc:active { transform: scale(0.97); }

.dc::after {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: var(--md-sys-shape-corner-sm);
  pointer-events: none;
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              border-radius var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

/* ── Accent bar (3px left border for holiday / adjusted) ── */
.dc::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
  pointer-events: none;
  transition: background var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}

.dc--holiday::before,
.dc--today-holiday::before {
  background: var(--app-festival-statutory);
}
/* 分类配色：法定/传统/西方（语义别名，设置页可自定义；默认跟随 error/tertiary/secondary）；
   覆盖在无类别回退（statutory）之上 */
.dc--cat-statutory::before { background: var(--app-festival-statutory); }
.dc--cat-traditional::before { background: var(--app-festival-traditional); }
.dc--cat-western::before { background: var(--app-festival-western); }
/* 调休补班：tertiary 让位给传统节日，改用 inverse-primary（5 套配色暗/亮均与
   primary/secondary/tertiary/error 不撞：如暗蓝 #3A5DA1 vs primary #A8C7FA…） */
.dc--adjusted::before,
.dc--today-adjusted::before {
  background: var(--md-sys-color-inverse-primary);
}

/* ── Number ── */
.dc__top { display: flex; align-items: flex-start; }

/* 内容层提升到 ::after 圆角块（hover/选中背景）之上，避免被遮挡 */
.dc__top,
.dc__label,
.dc__events,
.dc__add {
  position: relative;
  z-index: 1;
}
.dc__num {
  font: var(--md-sys-typescale-label-large);
  color: var(--md-sys-color-on-surface);
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--md-sys-shape-corner-full);
  transition: background var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard),
              color var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}
.dc__num--badge {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* ── 农历/节气子标签（数字右侧小字）── */
.dc__sub {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  padding: 8px 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.dc__sub--term {
  color: var(--md-sys-color-tertiary);
}

/* ── Label ── */
.dc__label {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  padding-left: 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dc__label--holiday { color: var(--app-festival-statutory); }
.dc--cat-traditional .dc__label--holiday { color: var(--app-festival-traditional); }
.dc--cat-western .dc__label--holiday { color: var(--app-festival-western); }

/* ── Events ── */
.dc__events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
  padding-left: 6px;
  min-width: 0; /* flex item 允许收缩，防止 nowrap 内容撑破列宽 */
}
.dc__chip {
  font: var(--md-sys-typescale-label-small);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-radius: var(--md-sys-shape-corner-sm);
  padding: 1px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  cursor: pointer;
}
.dc__more {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  padding-left: 6px;
}

/* ── 创建入口（hover 出现）── */
.dc__add {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-full);
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.dc:hover .dc__add { opacity: 1; }

/* ── Weekend column base ── */
.dc--wkcol { background: var(--md-sys-color-surface-container-lowest); }

/* ── Hover（透明度内联在背景色中，避免 opacity 跳变闪白）── */
.dc--default:hover::after { background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent); }
.dc--holiday:hover::after,
.dc--today-holiday:hover::after { background: color-mix(in srgb, var(--app-festival-statutory) 6%, transparent); }
.dc--cat-traditional:hover::after { background: color-mix(in srgb, var(--app-festival-traditional) 6%, transparent); }
.dc--cat-western:hover::after { background: color-mix(in srgb, var(--app-festival-western) 6%, transparent); }
.dc--adjusted:hover::after,
.dc--today-adjusted:hover::after { background: color-mix(in srgb, var(--md-sys-color-inverse-primary) 6%, transparent); }

/* ── Weekend / today-weekend ── */
.dc--weekend .dc__num { color: var(--md-sys-color-on-surface-variant); }
.dc--today-weekend .dc__num--badge {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* ── Today-holiday / today-adjusted ── */
.dc--today-holiday .dc__num--badge {
  background: var(--app-festival-statutory);
  color: var(--app-festival-statutory-fg);
}
.dc--cat-traditional.dc--today-holiday .dc__num--badge {
  background: var(--app-festival-traditional);
  color: var(--app-festival-traditional-fg);
}
.dc--cat-western.dc--today-holiday .dc__num--badge {
  background: var(--app-festival-western);
  color: var(--app-festival-western-fg);
}
/* 调休徽章：inverse-primary 底 + on-primary-container 前景（5 套配色暗/亮下均对比良好：
   暗 #3A5DA1+#D5E3FF、亮 #A8C7FA+#001B3F；MD3 无 on-inverse-primary token） */
.dc--today-adjusted .dc__num--badge {
  background: var(--md-sys-color-inverse-primary);
  color: var(--md-sys-color-on-primary-container);
}

/* ── Selected：圆角块（复用 ::after 圆角机制，不整格铺色）── */
.dc--selected::after { background: var(--md-sys-color-primary-container); }
.dc--selected .dc__num {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.dc--selected .dc__label { color: var(--md-sys-color-on-primary-container); }
.dc--selected .dc__chip {
  background: color-mix(in srgb, var(--md-sys-color-primary-container) 55%, var(--md-sys-color-surface-container-high));
  color: var(--md-sys-color-on-surface);
}

/* ── Muted ── */
.dc--muted { opacity: 0.28; cursor: pointer; }
.dc--muted:hover::after { background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent); }

@media (max-height: 700px) {
  .dc { min-height: 60px; padding: 4px 4px 4px 2px; }
}
</style>
