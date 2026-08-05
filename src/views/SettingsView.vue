<script setup lang="ts">
import { useCalendarStore } from '../stores/calendarStore'

const store = useCalendarStore()
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

