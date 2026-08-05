<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'
import { useEventsStore } from '../stores/eventsStore'
import { dateToKey, keyToDate } from '../core/events/engine'
import MiniCalendar from './MiniCalendar.vue'

const store = useCalendarStore()
const eventsStore = useEventsStore()
const today = new Date()

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const upcoming = computed(() => eventsStore.getUpcoming(dateToKey(today), 5))

function formatDate(key: string): string {
  const d = keyToDate(key)
  const yearPrefix = d.getFullYear() !== today.getFullYear() ? `${d.getFullYear()}年` : ''
  return `${yearPrefix}${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <span class="sidebar__logo">Kanadere</span>
    </div>

    <div class="sidebar__card">
      <MiniCalendar :week-starts-on="store.weekStartsOn" />
    </div>

    <div class="sidebar__card sidebar__events">
      <h3 class="sidebar__section-title">近期事件</h3>
      <div v-if="upcoming.length" class="sidebar__list">
        <button
          v-for="occ in upcoming"
          :key="`${occ.event.id}-${occ.date}`"
          class="sidebar__event"
          @click="store.goToDate(keyToDate(occ.date))"
        >
          <span class="sidebar__event-date">{{ formatDate(occ.date) }}</span>
          <span class="sidebar__event-title">{{ occ.event.title }}</span>
        </button>
      </div>
      <p v-else class="sidebar__empty">暂无事件</p>
    </div>

    <div class="sidebar__spacer" />

  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px; min-width: 260px;
  height: 100dvh;
  padding: 16px 12px;
  background: var(--md-sys-color-surface-container-low);
  border-right: 1px solid var(--md-sys-color-outline-variant);
}

.sidebar__brand { padding: 4px 8px 16px; }
.sidebar__logo {
  font: var(--md-sys-typescale-title-large);
  color: var(--md-sys-color-on-surface);
  letter-spacing: -0.5px;
}

.sidebar__card {
  background: var(--md-sys-color-surface-container);
  border-radius: var(--md-sys-shape-corner-md);
  padding: 12px;
  margin-bottom: 8px;
}

.sidebar__events { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.sidebar__section-title {
  font: var(--md-sys-typescale-title-small);
  color: var(--md-sys-color-on-surface);
  margin-bottom: 8px;
}
.sidebar__empty {
  font: var(--md-sys-typescale-body-small);
  color: var(--md-sys-color-on-surface-variant);
  text-align: center; padding: 16px 0;
}

.sidebar__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.sidebar__event {
  display: flex;
  flex-direction: column;
  gap: 1px;
  text-align: left;
  padding: 6px 8px;
  border-radius: var(--md-sys-shape-corner-sm);
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.sidebar__event:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent);
}
.sidebar__event-date {
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
}
.sidebar__event-title {
  font: var(--md-sys-typescale-body-small);
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__spacer { flex: 1; }

</style>
