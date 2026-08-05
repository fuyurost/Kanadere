<script setup lang="ts">
import type { ViewMode } from '../core/calendar/types'

defineProps<{
  mode: ViewMode
}>()
defineEmits<{
  change: [mode: ViewMode]
}>()

const tabs: { value: ViewMode; label: string }[] = [
  { value: 'month', label: '月' },
  { value: 'week', label: '周' },
  { value: 'day', label: '日' },
]
</script>

<template>
  <div class="vmt" role="tablist">
    <button
      v-for="t in tabs"
      :key="t.value"
      class="vmt__tab"
      :class="{ 'vmt__tab--active': mode === t.value }"
      role="tab"
      :aria-selected="mode === t.value"
      @click="$emit('change', t.value)"
    >
      {{ t.label }}
    </button>
  </div>
</template>

<style scoped>
.vmt {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
}

.vmt__tab {
  min-width: 44px;
  height: 30px;
  padding: 0 14px;
  border-radius: var(--md-sys-shape-corner-full);
  font: var(--md-sys-typescale-label-large);
  color: var(--md-sys-color-on-surface-variant);
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

.vmt__tab:hover {
  color: var(--md-sys-color-on-surface);
}

.vmt__tab--active {
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-1);
}
</style>
