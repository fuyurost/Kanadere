<script setup lang="ts">
import { ref } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'
import { useEventsStore } from '../stores/eventsStore'
import { useDebugStore, DEBUG_STORAGE_KEY } from '../stores/debugStore'

const store = useCalendarStore()
const eventsStore = useEventsStore()
const debugStore = useDebugStore()

const confirmTarget = ref<'clear' | 'reset' | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

function armConfirm(target: 'clear' | 'reset') {
  confirmTarget.value = target
  clearTimeout(confirmTimer)
  confirmTimer = setTimeout(() => {
    confirmTarget.value = null
  }, 3000)
}

function confirmClear() {
  if (confirmTarget.value === 'clear') {
    confirmTarget.value = null
    void eventsStore.clearEvents()
  } else {
    armConfirm('clear')
  }
}

function confirmReset() {
  if (confirmTarget.value === 'reset') {
    confirmTarget.value = null
    void eventsStore.clearEvents()
    store.reset()
    debugStore.reset()
    localStorage.removeItem(DEBUG_STORAGE_KEY)
  } else {
    armConfirm('reset')
  }
}
</script>

<template>
  <div class="settings">
    <h1 class="settings__title">设置</h1>

    <div class="settings__section">
      <h3 class="settings__section-title">外观</h3>
      <div class="settings__row" @click="store.toggleTheme()">
        <span class="settings__row-label">主题</span>
        <span class="settings__row-value">
          {{ store.theme === 'dark' ? '暗色' : '浅色' }}
          <span class="settings__row-hint">点击切换</span>
        </span>
      </div>
    </div>

    <div class="settings__section">
      <h3 class="settings__section-title">日历</h3>
      <div class="settings__row" @click="store.toggleWeekStartsOn()">
        <span class="settings__row-label">每周起始日</span>
        <span class="settings__row-value">
          {{ store.weekStartsOn === 0 ? '周日' : '周一' }}
          <span class="settings__row-hint">点击切换</span>
        </span>
      </div>
      <div class="settings__row settings__row--disabled">
        <span class="settings__row-label">显示周数</span>
        <span class="settings__row-value">即将推出</span>
      </div>
      <div class="settings__row settings__row--disabled">
        <span class="settings__row-label">节假日订阅</span>
        <span class="settings__row-value">即将推出</span>
      </div>
    </div>

    <div class="settings__section">
      <h3 class="settings__section-title">开发者</h3>
      <div class="settings__row" @click="debugStore.toggleWatermark()">
        <span class="settings__row-label">开发水印</span>
        <span class="settings__row-value">
          {{ debugStore.showWatermark ? '显示' : '隐藏' }}
          <span class="settings__row-hint">点击切换</span>
        </span>
      </div>
      <div
        class="settings__row"
        :class="{ 'settings__row--danger': confirmTarget === 'clear' }"
        @click="confirmClear"
      >
        <span class="settings__row-label">清除事件</span>
        <span class="settings__row-value">
          {{ confirmTarget === 'clear' ? '再次点击确认' : `共 ${eventsStore.events.length} 条` }}
        </span>
      </div>
      <div
        class="settings__row"
        :class="{ 'settings__row--danger': confirmTarget === 'reset' }"
        @click="confirmReset"
      >
        <span class="settings__row-label">一键重置</span>
        <span class="settings__row-value">
          {{ confirmTarget === 'reset' ? '再次点击确认' : '恢复默认状态' }}
        </span>
      </div>
      <p class="settings__row-hint settings__dev-hint">
        调试功能：清除事件 / 一键重置不可恢复，请谨慎操作
      </p>
    </div>

    <div class="settings__section">
      <h3 class="settings__section-title">关于</h3>
      <p class="settings__about">
        Kanadere — 中国节假日日历<br />
        Material Design 3<br />
        数据来源：国务院办公厅公告
      </p>
    </div>

  </div>
</template>

<style scoped>
.settings {
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px 120px;
  width: 100%;
  position: relative;
}

.settings__title {
  font: var(--md-sys-typescale-headline-small);
  color: var(--md-sys-color-on-surface);
  margin-bottom: 32px;
}

.settings__section { margin-bottom: 28px; }

.settings__section-title {
  font: var(--md-sys-typescale-title-small);
  color: var(--md-sys-color-primary);
  margin-bottom: 12px;
}

.settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: var(--md-sys-color-surface-container);
  border-radius: var(--md-sys-shape-corner-md);
  cursor: pointer;
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
  margin-bottom: 4px;
}
.settings__row:hover { background: var(--md-sys-color-surface-container-high); }

.settings__row--disabled { opacity: 0.5; cursor: default; }
.settings__row--disabled:hover { background: var(--md-sys-color-surface-container); }

.settings__row--danger {
  background: color-mix(in srgb, var(--md-sys-color-error) 12%, transparent);
}
.settings__row--danger .settings__row-label,
.settings__row--danger .settings__row-value {
  color: var(--md-sys-color-error);
}
.settings__row--danger:hover { background: color-mix(in srgb, var(--md-sys-color-error) 18%, transparent); }

.settings__dev-hint { padding: 8px 16px 0; }

.settings__row-label { font: var(--md-sys-typescale-body-large); color: var(--md-sys-color-on-surface); }
.settings__row-value {
  font: var(--md-sys-typescale-body-medium);
  color: var(--md-sys-color-on-surface-variant);
  display: flex; align-items: center; gap: 8px;
}
.settings__row-hint { font: var(--md-sys-typescale-label-small); color: var(--md-sys-color-outline); }

.settings__about {
  font: var(--md-sys-typescale-body-medium);
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.8;
}
</style>

