<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCalendar } from '../composables/useCalendar'
import { useSwipeNavigation } from '../composables/useSwipe'
import CalendarGrid from '../components/CalendarGrid.vue'

const { grid, yearMonth, store } = useCalendar()

const root = ref<HTMLElement | null>(null)
useSwipeNavigation(root, (dir) => {
  if (dir === 'left') store.goNext()
  else store.goPrev()
})

const slideName = computed(() => `slide-${store.navDirection}`)

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
  <div ref="root" class="mv" tabindex="0" @keydown="onKeydown">
    <Transition :name="slideName" mode="out-in">
      <CalendarGrid
        :key="`${yearMonth.year}-${yearMonth.month}`"
        :cells="grid.cells"
        :selected-date="store.selectedDate"
        :week-starts-on="store.weekStartsOn"
        @select="(date) => store.selectDate(date)"
      />
    </Transition>
  </div>
</template>

<style>
.slide-forward-enter-active,
.slide-forward-leave-active,
.slide-backward-enter-active,
.slide-backward-leave-active {
  transition: all var(--md-sys-motion-duration-medium3) var(--md-sys-motion-easing-emphasized-decelerate);
}
.slide-forward-leave-active,
.slide-backward-leave-active {
  transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-accelerate);
}
.slide-forward-enter-from { transform: translateX(80px); opacity: 0; }
.slide-forward-leave-to   { transform: translateX(-80px); opacity: 0; }
.slide-backward-enter-from { transform: translateX(-80px); opacity: 0; }
.slide-backward-leave-to   { transform: translateX(80px); opacity: 0; }
</style>

<style scoped>
.mv {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  outline: none;
  background: var(--md-sys-color-surface);
  overflow: hidden;
  touch-action: pan-y;
}
</style>
