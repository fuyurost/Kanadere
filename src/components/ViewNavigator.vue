<script setup lang="ts">
import { ref, nextTick } from 'vue'

const props = defineProps<{
  year: number
  month: number
}>()

const emit = defineEmits<{
  prev: []
  next: []
  prevYear: []
  nextYear: []
  goYear: [year: number]
}>()

const editing = ref(false)
const yearInput = ref<HTMLInputElement | null>(null)
const draft = ref(props.year)

async function startEdit() {
  draft.value = props.year
  editing.value = true
  await nextTick()
  yearInput.value?.focus()
  yearInput.value?.select()
}

function confirm() {
  const y = draft.value
  if (y >= 1900 && y <= 2100 && y !== props.year) {
    emit('goYear', y)
  }
  editing.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') confirm()
  if (e.key === 'Escape') editing.value = false
}
</script>

<template>
  <div class="vn">
    <div class="vn__row">
      <div class="vn__nav-group">
        <button class="vn__icon" title="上一年" @click="emit('prevYear')">
          <span class="vn__icon-text">«</span>
        </button>
        <button class="vn__icon" title="上一段" @click="emit('prev')">
          <span class="vn__icon-text">&#8249;</span>
        </button>
      </div>

      <h2 class="vn__heading">
        <span
          v-if="!editing"
          class="vn__year-text"
          role="button"
          tabindex="0"
          @click="startEdit"
          @keydown.enter="startEdit"
        >{{ year }}</span>
        <input
          v-else
          ref="yearInput"
          v-model.number="draft"
          type="number"
          min="1900"
          max="2100"
          class="vn__year-input"
          @blur="confirm"
          @keydown="onKeydown"
        />
        年 {{ month }}月
      </h2>

      <div class="vn__nav-group">
        <button class="vn__icon" title="下一段" @click="emit('next')">
          <span class="vn__icon-text">&#8250;</span>
        </button>
        <button class="vn__icon" title="下一年" @click="emit('nextYear')">
          <span class="vn__icon-text">»</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vn {
  padding: 4px 8px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.vn__row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 48px;
}

.vn__nav-group { display: flex; gap: 2px; }

.vn__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: var(--md-sys-shape-corner-full);
  color: var(--md-sys-color-on-surface-variant);
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.vn__icon:hover {
  color: var(--md-sys-color-on-surface);
  background: rgba(128, 128, 128, 0.12);
}

.vn__icon-text { font-size: 20px; line-height: 1; user-select: none; }

.vn__heading {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font: var(--md-sys-typescale-title-large);
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  padding: 0 8px;
}

.vn__year-text {
  cursor: pointer;
  border-radius: var(--md-sys-shape-corner-xs);
  padding: 2px 4px; margin: -2px -4px;
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.vn__year-text:hover {
  color: var(--md-sys-color-primary);
  background: rgba(168, 199, 250, 0.08);
}

.vn__year-input {
  width: 5ch;
  background: var(--md-sys-color-surface-bright);
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-xs);
  padding: 2px 4px;
  font: var(--md-sys-typescale-title-large);
  color: var(--md-sys-color-on-surface);
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
}
.vn__year-input::-webkit-outer-spin-button,
.vn__year-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.vn__year-input:focus {
  border-color: var(--md-sys-color-primary);
  box-shadow: 0 0 0 1px var(--md-sys-color-primary);
}
</style>
