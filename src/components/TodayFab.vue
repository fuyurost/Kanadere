<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'

const store = useCalendarStore()

const visible = computed(() => {
  const now = new Date()
  const cur = store.currentDate
  return now.getFullYear() !== cur.getFullYear() || now.getMonth() !== cur.getMonth()
})
</script>

<template>
  <Transition name="fab">
    <button v-if="visible" class="fab" title="回到今天" @click="store.goToToday()">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zM9 18H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
      </svg>
    </button>
  </Transition>
</template>

<style scoped>
.fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: var(--md-sys-elevation-3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: box-shadow var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.fab:hover {
  box-shadow: var(--md-sys-elevation-3), 0 0 0 4px rgba(168, 199, 250, 0.2);
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.fab:active {
  transform: scale(0.95);
  transition: transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

/* ── enter / leave ── */
.fab-enter-active {
  transition: all var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized-decelerate);
}
.fab-leave-active {
  transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-accelerate);
}
.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
