<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useEventsStore } from '../stores/eventsStore'
import { useCalendarStore } from '../stores/calendarStore'
import { validateEvent } from '../core/events/engine'
import type { EventDraft } from '../core/events/types'
import type { RecurrenceFrequency } from '../core/events/types'
import DatePicker from './DatePicker.vue'

const eventsStore = useEventsStore()
const calendarStore = useCalendarStore()

const dialog = computed(() => eventsStore.dialog)

const UNIT_LABEL: Record<string, string> = {
  daily: '天',
  weekly: '周',
  monthly: '月',
  yearly: '年',
}

const form = reactive({
  title: '',
  date: '',
  allDay: false,
  startTime: '09:00',
  endTime: '10:00',
  repeat: 'none' as 'none' | RecurrenceFrequency,
  interval: 1,
  until: '',
})
const error = ref('')

const unitLabel = computed(() => UNIT_LABEL[form.repeat] ?? '')

const editingEvent = computed(() => {
  const d = eventsStore.dialog
  if (d?.mode !== 'edit') return undefined
  return eventsStore.events.find((e) => e.id === d.id)
})

/** dialog 打开/切换时重置并预填表单 */
watch(
  () => eventsStore.dialog,
  (d) => {
    error.value = ''
    if (d === null) return
    form.repeat = 'none'
    form.interval = 1
    form.until = ''
    if (d.mode === 'create') {
      form.title = ''
      form.date = d.date
      form.allDay = false
      const base = d.time ?? '09:00'
      form.startTime = base
      const h = Number(base.slice(0, 2))
      form.endTime = `${String((h + 1) % 24).padStart(2, '0')}:${base.slice(3)}`
      return
    }
    const ev = eventsStore.events.find((e) => e.id === d.id)
    if (!ev) {
      eventsStore.closeDialog()
      return
    }
    form.title = ev.title
    form.date = ev.date
    form.allDay = ev.allDay
    form.startTime = ev.startTime ?? '09:00'
    form.endTime = ev.endTime ?? '10:00'
    form.repeat = ev.recurrence?.frequency ?? 'none'
    form.interval = ev.recurrence?.interval ?? 1
    form.until = ev.recurrence?.until ?? ''
  },
)

async function save() {
  const d = eventsStore.dialog
  if (d === null) return
  const draft: EventDraft = {
    title: form.title,
    date: form.date,
    allDay: form.allDay,
    startTime: form.allDay ? undefined : form.startTime,
    endTime: form.allDay ? undefined : form.endTime,
    recurrence:
      form.repeat === 'none'
        ? undefined
        : {
            frequency: form.repeat,
            interval: form.interval,
            ...(form.until ? { until: form.until } : {}),
          },
  }
  const errors = validateEvent(draft)
  if (errors.length > 0) {
    error.value = errors[0]!
    return
  }
  if (d.mode === 'create') await eventsStore.createEvent(draft)
  else await eventsStore.updateEvent(d.id, draft)
  eventsStore.closeDialog()
}

async function remove() {
  const d = eventsStore.dialog
  if (d?.mode !== 'edit') return
  if (confirm('确定删除该事件？')) {
    await eventsStore.deleteEvent(d.id)
    eventsStore.closeDialog()
  }
}
</script>

<template>
  <Transition name="ed">
    <div v-if="dialog" class="ed" @keydown.esc="eventsStore.closeDialog()">
      <div class="ed__scrim" @click="eventsStore.closeDialog()" />
    <div
      class="ed__card"
      role="dialog"
      aria-modal="true"
      :aria-label="dialog.mode === 'create' ? '新建事件' : '编辑事件'"
    >
      <h2 class="ed__title">{{ dialog.mode === 'create' ? '新建事件' : '编辑事件' }}</h2>

      <label class="ed__field">
        <span class="ed__label">标题</span>
        <input v-model="form.title" class="ed__input" type="text" placeholder="事件标题" autofocus />
      </label>

      <label class="ed__field">
        <span class="ed__label">日期</span>
        <DatePicker v-model="form.date" :week-starts-on="calendarStore.weekStartsOn" />
      </label>

      <label class="ed__field ed__field--row">
        <span class="ed__label">全天</span>
        <input v-model="form.allDay" class="ed__switch" type="checkbox" />
      </label>

      <div class="ed__row">
        <label class="ed__field">
          <span class="ed__label">开始时间</span>
          <input v-model="form.startTime" class="ed__input" type="time" step="60" :disabled="form.allDay" />
        </label>
        <label class="ed__field">
          <span class="ed__label">结束时间</span>
          <input v-model="form.endTime" class="ed__input" type="time" step="60" :disabled="form.allDay" />
        </label>
      </div>

      <label class="ed__field">
        <span class="ed__label">重复</span>
        <select v-model="form.repeat" class="ed__input">
          <option value="none">不重复</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
          <option value="yearly">每年</option>
        </select>
      </label>

      <div v-if="form.repeat !== 'none'" class="ed__row">
        <label class="ed__field">
          <span class="ed__label">每 {{ form.interval }} {{ unitLabel }}重复一次</span>
          <input v-model.number="form.interval" class="ed__input" type="number" min="1" max="99" />
        </label>
        <label class="ed__field">
          <span class="ed__label">结束日期（留空 = 永不）</span>
          <input v-model="form.until" class="ed__input" type="date" />
        </label>
      </div>

      <p v-if="dialog.mode === 'edit' && editingEvent?.recurrence" class="ed__hint">
        修改将应用到整个重复系列
      </p>
      <p v-if="error" class="ed__error">{{ error }}</p>

      <footer class="ed__actions">
        <button v-if="dialog.mode === 'edit'" class="ed__btn ed__btn--delete" @click="remove">删除</button>
        <div class="ed__actions-right">
          <button class="ed__btn" @click="eventsStore.closeDialog()">取消</button>
          <button class="ed__btn ed__btn--filled" @click="save">保存</button>
        </div>
      </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ed {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ed__scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 40%, transparent);
}

.ed__card {
  position: relative;
  width: min(480px, calc(100vw - 32px));
  max-width: 480px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-lg);
}

.ed__title {
  font: var(--md-sys-typescale-title-medium);
  color: var(--md-sys-color-on-surface);
}

.ed__row {
  display: flex;
  gap: 12px;
}
.ed__row > .ed__field {
  flex: 1;
  min-width: 0;
}

.ed__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ed__field--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.ed__label {
  font: var(--md-sys-typescale-body-medium);
  color: var(--md-sys-color-on-surface-variant);
}

.ed__input {
  font: var(--md-sys-typescale-body-large);
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-sm);
  padding: 10px 12px;
  width: 100%;
}
.ed__input:focus {
  outline: none;
  border-color: var(--md-sys-color-primary);
}
.ed__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── MD3 switch ── */
.ed__switch {
  position: relative;
  width: 52px;
  height: 32px;
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  background: var(--md-sys-color-surface-container-highest);
  border: 2px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  transition: background var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard),
              border-color var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}
.ed__switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-outline);
  transition: transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard),
              background var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}
.ed__switch:checked {
  background: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
}
.ed__switch:checked::after {
  transform: translateX(20px);
  background: var(--md-sys-color-on-primary);
}

.ed__hint {
  font: var(--md-sys-typescale-body-small);
  color: var(--md-sys-color-on-surface-variant);
}

.ed__error {
  font: var(--md-sys-typescale-body-small);
  color: var(--md-sys-color-error);
}

.ed__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ed__actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.ed__btn {
  font: var(--md-sys-typescale-label-large);
  color: var(--md-sys-color-primary);
  padding: 8px 16px;
  border-radius: var(--md-sys-shape-corner-full);
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.ed__btn:hover {
  background: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
}
.ed__btn--filled {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.ed__btn--filled:hover {
  background: var(--md-sys-color-primary);
  filter: brightness(1.08);
}
.ed__btn--delete {
  color: var(--md-sys-color-error);
}
.ed__btn--delete:hover {
  background: color-mix(in srgb, var(--md-sys-color-error) 8%, transparent);
}

/* ── MD3 开合动画：scrim 淡入淡出 + 卡片缩放 ── */
.ed-enter-active {
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate);
}
.ed-leave-active {
  transition: opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}
.ed-enter-from,
.ed-leave-to {
  opacity: 0;
}
.ed-enter-active .ed__card {
  transition: transform var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized-decelerate);
}
.ed-leave-active .ed__card {
  transition: transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}
.ed-enter-from .ed__card,
.ed-leave-to .ed__card {
  transform: scale(0.9);
}
</style>
