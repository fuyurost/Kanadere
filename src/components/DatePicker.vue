<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { addDays, isSameDay, isToday, startOfWeek } from 'date-fns'

const props = withDefaults(
  defineProps<{
    /** 'YYYY-MM-DD'（本地时区） */
    modelValue: string
    weekStartsOn?: 0 | 1
  }>(),
  { weekStartsOn: 1 },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const viewDate = ref(new Date())
const triggerEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const panelStyle = ref({ top: '0px', left: '0px' })

const PANEL_WIDTH = 320
const OFFSET = 8

/** 解析 'YYYY-MM-DD' 为本地 Date（new Date(y, m, d)，无 UTC 偏移） */
function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

const selected = computed(() => parseDateKey(props.modelValue))

const displayText = computed(() => {
  const d = selected.value
  if (!d) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const viewYear = computed(() => viewDate.value.getFullYear())
const viewMonth = computed(() => viewDate.value.getMonth() + 1)

const weekLabels = computed(() =>
  props.weekStartsOn === 0
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['一', '二', '三', '四', '五', '六', '日'],
)

/** 6 行 × 7 列，自视图月首日所在周的起始日（按 weekStartsOn）起 */
const gridDays = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value - 1, 1)
  const start = startOfWeek(first, { weekStartsOn: props.weekStartsOn })
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
})

function isCurrentMonth(d: Date): boolean {
  return d.getFullYear() === viewYear.value && d.getMonth() === viewMonth.value - 1
}

function prevMonth() {
  viewDate.value = new Date(viewYear.value, viewMonth.value - 1, 1)
}
function nextMonth() {
  viewDate.value = new Date(viewYear.value, viewMonth.value + 1, 1)
}

function toggle() {
  if (open.value) close()
  else openPanel()
}

function openPanel() {
  // 打开时视图月定位到 modelValue 所在月，无值则当月
  const base = selected.value ?? new Date()
  viewDate.value = new Date(base.getFullYear(), base.getMonth(), 1)
  open.value = true
  void nextTick(positionPanel)
}

function close() {
  open.value = false
}

/**
 * fixed 定位：按触发元素视口位置放置面板。
 * 对话框 .ed__card 有 overflow-y: auto，absolute 会被裁剪，故用 fixed + getBoundingClientRect。
 */
function positionPanel() {
  if (!open.value) return
  const trigger = triggerEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const panelH = panelEl.value?.offsetHeight ?? 300
  const vw = window.innerWidth
  const vh = window.innerHeight
  let top = rect.bottom + OFFSET
  if (top + panelH + OFFSET > vh) top = Math.max(OFFSET, rect.top - OFFSET - panelH)
  const left = Math.min(Math.max(rect.left, OFFSET), vw - PANEL_WIDTH - OFFSET)
  panelStyle.value = { top: `${top}px`, left: `${left}px` }
}

function pickDate(d: Date) {
  emit('update:modelValue', toDateKey(d))
  close()
}

// 点击面板外部关闭（capture：先于 .ed__scrim / 其他 click 处理）
function onDocPointerDown(e: PointerEvent) {
  if (!open.value) return
  const target = e.target as Node | null
  if (!target) return
  if (triggerEl.value?.contains(target) || panelEl.value?.contains(target)) return
  close()
}

// 面板打开时 Esc 只收起面板（capture + stopPropagation，不触发外层对话框的 esc 关闭）
function onDocKeydown(e: KeyboardEvent) {
  if (!open.value || e.key !== 'Escape') return
  e.stopPropagation()
  close()
}

window.addEventListener('pointerdown', onDocPointerDown, true)
window.addEventListener('keydown', onDocKeydown, true)
window.addEventListener('scroll', positionPanel, true)
window.addEventListener('resize', positionPanel)

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onDocPointerDown, true)
  window.removeEventListener('keydown', onDocKeydown, true)
  window.removeEventListener('scroll', positionPanel, true)
  window.removeEventListener('resize', positionPanel)
})
</script>

<template>
  <div class="dp">
    <div
      ref="triggerEl"
      class="dp__trigger"
      :class="{ 'dp__trigger--placeholder': !displayText }"
      role="button"
      tabindex="0"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <span>{{ displayText || '选择日期' }}</span>
      <svg
        class="dp__icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </div>

    <Transition name="dp">
      <div
        v-if="open"
        ref="panelEl"
        class="dp__panel"
        role="dialog"
        aria-label="选择日期"
        :style="panelStyle"
      >
        <div class="dp__head">
          <button class="dp__nav" type="button" aria-label="上个月" @click="prevMonth">&#8249;</button>
          <span class="dp__label">{{ viewYear }}年{{ viewMonth }}月</span>
          <button class="dp__nav" type="button" aria-label="下个月" @click="nextMonth">&#8250;</button>
        </div>
        <div class="dp__weekdays">
          <span v-for="l in weekLabels" :key="l" class="dp__wd">{{ l }}</span>
        </div>
        <div class="dp__grid">
          <button
            v-for="(d, i) in gridDays"
            :key="i"
            type="button"
            class="dp__day"
            :class="{
              'dp__day--dim': !isCurrentMonth(d),
              'dp__day--today': isToday(d),
              'dp__day--selected': selected != null && isSameDay(d, selected),
            }"
            @click="pickDate(d)"
          >
            <span class="dp__day-num">{{ d.getDate() }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dp {
  width: 100%;
}

.dp__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  font: var(--md-sys-typescale-body-large);
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-sm);
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.dp__trigger--placeholder {
  color: var(--md-sys-color-on-surface-variant);
}
.dp__trigger:focus-visible {
  outline: none;
  border-color: var(--md-sys-color-primary);
}
.dp__icon {
  flex-shrink: 0;
  color: var(--md-sys-color-on-surface-variant);
}

/* ── 弹出面板（fixed，避免被对话框 .ed__card 的 overflow 裁剪）── */
.dp__panel {
  position: fixed;
  z-index: 20;
  width: 320px;
  padding: 12px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-md);
  box-shadow: var(--md-sys-elevation-3);
}

.dp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
  margin-bottom: 6px;
}
.dp__nav {
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
.dp__nav:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent);
}
.dp__label {
  font: var(--md-sys-typescale-label-large);
  color: var(--md-sys-color-on-surface);
}

.dp__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 36px);
  justify-content: center;
  gap: 2px;
  text-align: center;
  margin-bottom: 2px;
}
.dp__wd {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  padding: 2px 0;
}

.dp__grid {
  display: grid;
  grid-template-columns: repeat(7, 36px);
  justify-content: center;
  gap: 2px;
}
.dp__day {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: var(--md-sys-shape-corner-sm);
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  transition:
    background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.dp__day:hover {
  background: color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent);
}
.dp__day--dim {
  opacity: 0.4;
}
.dp__day-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--md-sys-shape-corner-full);
}
/* 今日 / 选中：primary 实心圆 badge（沿用 DateCell 的 dc__num--badge 模式） */
.dp__day--today .dp__day-num,
.dp__day--selected .dp__day-num {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
/* 选中：primary-container 圆角块 */
.dp__day--selected {
  background: var(--md-sys-color-primary-container);
}

/* ── 面板弹出/收起动画 ── */
.dp-enter-active {
  transition:
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-decelerate),
    transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-decelerate);
}
.dp-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-emphasized-accelerate),
    transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-emphasized-accelerate);
}
.dp-enter-from,
.dp-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
