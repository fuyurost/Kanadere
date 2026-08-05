<script setup lang="ts">
import { useCalendarStore } from '../stores/calendarStore'
import MiniCalendar from './MiniCalendar.vue'

const store = useCalendarStore()
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
      <p class="sidebar__empty">暂无事件</p>
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

.sidebar__spacer { flex: 1; }

</style>
