<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCalendarStore } from './stores/calendarStore'
import { useDebugStore } from './stores/debugStore'
import Sidebar from './components/Sidebar.vue'
import ViewNavigator from './components/ViewNavigator.vue'
import ViewModeTabs from './components/ViewModeTabs.vue'
import TodayFab from './components/TodayFab.vue'
import MonthView from './views/MonthView.vue'
import WeekView from './views/WeekView.vue'
import DayView from './views/DayView.vue'
import SettingsView from './views/SettingsView.vue'
import EventDialog from './components/EventDialog.vue'

const store = useCalendarStore()
const debugStore = useDebugStore()
const appVersion = __APP_VERSION__
const transitionName = ref('view')
const overlayOrigin = ref({ x: 0, y: 0 })
const gearRef = ref<HTMLElement | null>(null)
const open = computed(() => store.currentView === 'settings')
const iconOpen = ref(false)

// 任何绕过 closeSettings() 的视图切换（如一键重置）都会离开 settings，
// 同步复位图标，避免齿轮↔X 卡在错误状态
watch(
  () => store.currentView,
  (v) => {
    if (v !== 'settings') iconOpen.value = false
  },
)

function clickSettings() {
  if (open.value) {
    closeSettings()
  } else if (gearRef.value) {
    const rect = gearRef.value.getBoundingClientRect()
    openSettings({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }
}
const overlayOpen = ref(false)

function openSettings(origin: { x: number; y: number }) {
  iconOpen.value = true
  overlayOrigin.value = origin
  overlayOpen.value = false
  store.currentView = 'settings'
  setTimeout(() => {
    overlayOpen.value = true
  }, 50)
}

function closeSettings() {
  iconOpen.value = false
  overlayOpen.value = false
  setTimeout(() => {
    store.currentView = 'month'
  }, 400)
}

const clipStyle = computed(() => {
  const { x, y } = overlayOrigin.value
  const r = overlayOpen.value ? 150 : 0
  return `circle(${r}vmax at ${x}px ${y}px)`
})

const activeView = computed(() => {
  switch (store.viewMode) {
    case 'week': return WeekView
    case 'day': return DayView
    default: return MonthView
  }
})
</script>

<template>
  <div class="app">
    <Sidebar />
    <main class="app__main">
      <!-- 固定层：导航栏 + 视图切换 tabs + FAB 不参与切换动画 -->
      <ViewNavigator
        :year="store.currentDate.getFullYear()"
        :month="store.currentDate.getMonth() + 1"
        @prev="store.goPrev()"
        @next="store.goNext()"
        @prev-year="store.goToYear(store.currentDate.getFullYear() - 1)"
        @next-year="store.goToYear(store.currentDate.getFullYear() + 1)"
        @go-year="(y) => store.goToYear(y)"
      />
      <div class="app__tabs">
        <ViewModeTabs :mode="store.viewMode" @change="store.setViewMode" />
      </div>
      <!-- 视图组件常驻：settings 开关不卸载（被 overlay 盖住），不触发切换动画；
           仅 viewMode 变化（key 变化）时播放 view transition -->
      <Transition :name="transitionName" mode="out-in">
        <component
          :is="activeView"
          :key="store.viewMode"
        />
      </Transition>
      <TodayFab />
    </main>

    <!-- Settings overlay (container transform from gear) -->
    <div
      class="overlay"
      :class="{ 'overlay--hidden': store.currentView !== 'settings' }"
      :style="{ clipPath: clipStyle }"
    >
      <SettingsView />
    </div>

    <!-- Standalone settings button (floats above overlay) -->
    <button
      ref="gearRef"
      class="settings-btn"
      :class="{ 'is-open': open }"
      @click="clickSettings"
      :aria-label="open ? '关闭设置' : '设置'"
    >
      <Transition name="icon-swap" mode="out-in">
        <svg v-if="!iconOpen" key="gear" class="settings-btn__gear" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <svg v-else key="x" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </Transition>
    </button>

    <!-- 事件创建/编辑对话框（z-index 1100，覆盖设置层） -->
    <EventDialog />

    <!-- 开发水印（调试选项开启时显示） -->
    <div v-if="debugStore.showWatermark" class="dev-watermark">
      Kanadere v{{ appVersion }} · 开发中界面，不代表最终功能形态
    </div>
  </div>
</template>

<style>
/* 视图切换：快速 fade + 轻微缩放上浮（200ms 进场 / 150ms 离场） */
.view-enter-active {
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate),
              transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate);
}
.view-leave-active {
  transition: opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate),
              transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}
.view-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(6px);
}
.view-leave-to {
  opacity: 0;
  transform: scale(1.01) translateY(-2px);
}

/* ── 开发水印 ── */
.dev-watermark {
  position: fixed;
  right: 10px;
  bottom: 8px;
  z-index: 1200;
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
  opacity: 0.55;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}
</style>

<style scoped>
.app {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  background: var(--md-sys-color-surface);
}

.app__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.app__tabs {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: var(--md-sys-color-surface-container-high);
  transition: clip-path var(--md-sys-motion-duration-medium3) var(--md-sys-motion-easing-standard);
  display: flex;
  overflow-y: auto;
  pointer-events: none;
}

.overlay > :deep(*) {
  pointer-events: auto;
}
.overlay--hidden {
  visibility: hidden;
  pointer-events: none;
}

/* ── Standalone settings button ── */
.settings-btn {
  position: fixed;
  left: 12px;
  bottom: 16px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--md-sys-color-on-surface-variant);
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
              transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-emphasized);
}
.settings-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  transform: scale(1.12);
}
.settings-btn:active {
  transform: scale(0.9);
}
.settings-btn.is-open {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

/* 悬浮时齿轮缓缓旋转 */
.settings-btn__gear {
  transition: transform var(--md-sys-motion-duration-medium3) var(--md-sys-motion-easing-emphasized);
}
.settings-btn:hover .settings-btn__gear {
  transform: rotate(60deg);
}

/* ── Icon swap transition：180° 旋转 + 缩放，缓出进场 / 急出离场 ── */
.icon-swap-enter-active {
  transition: all var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized-decelerate);
}
.icon-swap-leave-active {
  transition: all var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}
.icon-swap-enter-from {
  opacity: 0;
  transform: rotate(-180deg) scale(0.4);
}
.icon-swap-leave-to {
  opacity: 0;
  transform: rotate(180deg) scale(0.4);
}
</style>
