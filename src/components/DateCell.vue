<script setup lang="ts">
import { computed } from 'vue'
import type { DateCell } from '../core/calendar/types'
import { DayType } from '../core/holiday/types'

const props = defineProps<{
  cell: DateCell
  isToday: boolean
  isSelected: boolean
  isWeekendCol?: boolean
}>()
const emit = defineEmits<{ select: [date: Date] }>()

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
</script>

<template>
  <div
    :class="['dc', `dc--${cellState}`, { 'dc--wkcol': isWeekendCol && cell.isCurrentMonth && cellState !== 'selected' }]"
    @click="emit('select', cell.date)"
  >
    <div class="dc__top">
      <span :class="['dc__num', { 'dc__num--badge': isToday || isSelected }]">{{ cell.date.getDate() }}</span>
    </div>
    <span v-if="label" :class="['dc__label', { 'dc__label--holiday': cell.dayType === DayType.Holiday }]">{{ label }}</span>
  </div>
</template>

<style scoped>
.dc {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 80px;
  padding: 6px 6px 6px 4px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  cursor: pointer;
  user-select: none;
  transition: transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              background var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
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
  background: var(--md-sys-color-error);
}
.dc--adjusted::before,
.dc--today-adjusted::before {
  background: var(--md-sys-color-tertiary);
}

/* ── Number ── */
.dc__top { display: flex; align-items: flex-start; }
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

/* ── Label ── */
.dc__label {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  padding-left: 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dc__label--holiday { color: var(--md-sys-color-error); }

/* ── Weekend column base ── */
.dc--wkcol { background: var(--md-sys-color-surface-container-lowest); }

/* ── Hover（透明度内联在背景色中，避免 opacity 跳变闪白）── */
.dc--default:hover::after { background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent); }
.dc--holiday:hover::after,
.dc--today-holiday:hover::after { background: color-mix(in srgb, var(--md-sys-color-error) 6%, transparent); }
.dc--adjusted:hover::after,
.dc--today-adjusted:hover::after { background: color-mix(in srgb, var(--md-sys-color-tertiary) 6%, transparent); }

/* ── Weekend / today-weekend ── */
.dc--weekend .dc__num { color: var(--md-sys-color-on-surface-variant); }
.dc--today-weekend .dc__num--badge {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* ── Today-holiday / today-adjusted ── */
.dc--today-holiday .dc__num--badge {
  background: var(--md-sys-color-error);
  color: var(--md-sys-color-on-error);
}
.dc--today-adjusted .dc__num--badge {
  background: var(--md-sys-color-tertiary);
  color: var(--md-sys-color-on-tertiary);
}

/* ── Selected ── */
.dc--selected { background: var(--md-sys-color-primary-container); }
.dc--selected .dc__num {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.dc--selected .dc__label { color: var(--md-sys-color-on-primary-container); }

/* ── Muted ── */
.dc--muted { opacity: 0.28; cursor: pointer; }
.dc--muted:hover::after { background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent); }

@media (max-height: 700px) {
  .dc { min-height: 60px; padding: 4px 4px 4px 2px; }
}
</style>
