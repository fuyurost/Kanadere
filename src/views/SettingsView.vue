<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'
import { useEventsStore } from '../stores/eventsStore'
import { useDebugStore, DEBUG_STORAGE_KEY } from '../stores/debugStore'
import { generateICal, parseICal } from '../core/events/ical'

const store = useCalendarStore()
const eventsStore = useEventsStore()
const debugStore = useDebugStore()
const appVersion = __APP_VERSION__

/** 配色方案选择器（色值 = 各方案 dark 主色；动态取色用彩虹渐变点） */
const COLOR_SCHEMES = [
  { id: 'blue', name: '蓝色', swatch: '#A8C7FA' },
  { id: 'green', name: '绿色', swatch: '#8FD39B' },
  { id: 'purple', name: '紫色', swatch: '#D0BCFF' },
  { id: 'orange', name: '橙色', swatch: '#FFB77C' },
  { id: 'dynamic', name: '动态取色', swatch: 'conic-gradient(#ff6b6b, #ffd93d, #6bcb77, #4d96ff, #b983ff, #ff6b6b)' },
] as const

const currentScheme = computed(() => {
  const base = COLOR_SCHEMES.find((s) => s.id === store.colorScheme) ?? COLOR_SCHEMES[0]!
  // 动态取色已提取种子色时，色点显示实际种子色
  if (store.colorScheme === 'dynamic' && store.dynamicSeed) {
    return { ...base, swatch: store.dynamicSeed }
  }
  return base
})

/** 配色下拉（fixed 定位，仿 DatePicker 弹层模式） */
const schemeOpen = ref(false)
const schemeTriggerEl = ref<HTMLElement | null>(null)
const schemePanelEl = ref<HTMLElement | null>(null)
const schemePanelStyle = ref({ top: '0px', left: '0px' })

function positionSchemePanel() {
  if (!schemeOpen.value || !schemeTriggerEl.value) return
  const rect = schemeTriggerEl.value.getBoundingClientRect()
  const panelH = schemePanelEl.value?.offsetHeight ?? 176
  const vw = window.innerWidth
  let top = rect.bottom + 6
  if (top + panelH + 6 > window.innerHeight) top = Math.max(6, rect.top - 6 - panelH)
  const left = Math.min(Math.max(rect.left, 6), vw - 200 - 6)
  schemePanelStyle.value = { top: `${top}px`, left: `${left}px` }
}

function onSchemeDocPointerDown(e: PointerEvent) {
  if (!schemeOpen.value) return
  const t = e.target as Node | null
  if (!t) return
  if (schemeTriggerEl.value?.contains(t) || schemePanelEl.value?.contains(t)) return
  schemeOpen.value = false
}

function onSchemeDocKeydown(e: KeyboardEvent) {
  if (!schemeOpen.value || e.key !== 'Escape') return
  e.stopPropagation()
  schemeOpen.value = false
}

function pickScheme(id: (typeof COLOR_SCHEMES)[number]['id']) {
  if (id === 'dynamic') {
    void pickImageSeed()
    return
  }
  store.setColorScheme(id)
  schemeOpen.value = false
}

/** 动态取色：选择图片 → 提取主色 → 生成色板 */
async function pickImageSeed() {
  const file = await pickImageFile()
  if (!file) return
  try {
    const { extractSeedFromFile } = await import('../utils/extractColor')
    const seed = await extractSeedFromFile(file)
    store.setDynamicSeed(seed)
    schemeOpen.value = false
    showDataNotice(true, `已应用动态配色（种子色 ${seed}）`)
  } catch {
    showDataNotice(false, '图片读取失败，请换一张图片重试')
  }
}

/** 图片文件选择；用户取消返回 null */
function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    const done = (file: File | null) => {
      input.remove()
      resolve(file)
    }
    input.addEventListener('change', () => done(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => done(null))
    document.body.appendChild(input)
    input.click()
  })
}

watch(schemeOpen, (open) => {
  if (open) void nextTick(positionSchemePanel)
})

window.addEventListener('pointerdown', onSchemeDocPointerDown, true)
window.addEventListener('keydown', onSchemeDocKeydown, true)
window.addEventListener('scroll', positionSchemePanel, true)
window.addEventListener('resize', positionSchemePanel)
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onSchemeDocPointerDown, true)
  window.removeEventListener('keydown', onSchemeDocKeydown, true)
  window.removeEventListener('scroll', positionSchemePanel, true)
  window.removeEventListener('resize', positionSchemePanel)
})

const confirmTarget = ref<'clear' | 'reset' | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

/** 版本号连点解锁开发者分区（2s 内连续 10 次） */
const versionTaps = ref(0)
let lastVersionTap = 0
const showDevConfirm = ref(false)

function onVersionTap() {
  const now = Date.now()
  if (now - lastVersionTap > 2000) versionTaps.value = 0
  lastVersionTap = now
  versionTaps.value++
  if (versionTaps.value >= 10) {
    versionTaps.value = 0
    showDevConfirm.value = true
  }
}

function confirmDevMode() {
  debugStore.unlockDeveloper()
  showDevConfirm.value = false
}

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

/** 运行时平台检测：Tauri 桌面（WebView2 注入 __TAURI_INTERNALS__）vs 纯浏览器 */
function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in (window as unknown as Record<string, unknown>)
  )
}

/** 导入结果轻提示（样式与 dev-confirm 弹窗一致，5s 自动消失） */
const dataNotice = ref<{ ok: boolean; message: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined

function showDataNotice(ok: boolean, message: string) {
  dataNotice.value = { ok, message }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    dataNotice.value = null
  }, 5000)
}

/**
 * 导出全部事件为 .ics 文件：
 * Web → Blob + <a download>；Tauri → 原生保存对话框 + plugin-fs writeTextFile
 * （桌面路径直接使用 save() 返回值，权限走 Rust 侧 capabilities 白名单）。
 */
async function exportEvents() {
  const ics = generateICal(eventsStore.events)
  if (isTauriRuntime()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const filePath = await save({
      title: '导出事件',
      defaultPath: 'kanadere-events.ics',
      filters: [{ name: 'iCalendar', extensions: ['ics'] }],
    })
    if (filePath) await writeTextFile(filePath, ics)
  } else {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'kanadere-events.ics'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

/** 浏览器文件选择；用户取消（cancel 事件）返回 null */
function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ics,text/calendar'
    input.style.display = 'none'
    const done = (file: File | null) => {
      input.remove()
      resolve(file)
    }
    input.addEventListener('change', () => done(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => done(null))
    document.body.appendChild(input)
    input.click()
  })
}

/**
 * 从 .ics 导入并合并：跳过与现有事件完全相同（title/date/allDay/startTime）的重复项；
 * createEvent 内部校验抛错的事件计入跳过。
 */
async function importEvents() {
  try {
    let text: string
    if (isTauriRuntime()) {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readTextFile } = await import('@tauri-apps/plugin-fs')
      const selected = await open({
        title: '导入事件',
        multiple: false,
        filters: [{ name: 'iCalendar', extensions: ['ics'] }],
      })
      if (typeof selected !== 'string') return
      text = await readTextFile(selected)
    } else {
      const file = await pickFile()
      if (!file) return
      text = await file.text()
    }

    const drafts = parseICal(text)
    let imported = 0
    let skipped = 0
    for (const draft of drafts) {
      const isDuplicate = eventsStore.events.some(
        (e) =>
          e.title === draft.title &&
          e.date === draft.date &&
          e.allDay === draft.allDay &&
          e.startTime === draft.startTime,
      )
      if (isDuplicate) {
        skipped++
        continue
      }
      try {
        await eventsStore.createEvent(draft)
        imported++
      } catch {
        skipped++
      }
    }
    showDataNotice(true, `成功导入 ${imported} 条，跳过 ${skipped} 条重复/无效`)
  } catch {
    showDataNotice(false, '读取文件失败，请确认文件是有效的 .ics 格式')
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
      <div class="settings__row">
        <span class="settings__row-label">配色</span>
        <span class="settings__row-value">
          <div
            ref="schemeTriggerEl"
            class="settings__scheme-trigger"
            role="button"
            tabindex="0"
            aria-haspopup="listbox"
            :aria-expanded="schemeOpen"
            @click="schemeOpen = !schemeOpen"
            @keydown.enter.prevent="schemeOpen = !schemeOpen"
            @keydown.space.prevent="schemeOpen = !schemeOpen"
          >
            <span class="settings__scheme-dot" :style="{ background: currentScheme.swatch }" />
            <span>{{ currentScheme.name }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
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
      <h3 class="settings__section-title">数据</h3>
      <div class="settings__row" @click="exportEvents">
        <span class="settings__row-label">导出事件</span>
        <span class="settings__row-value">
          {{ eventsStore.events.length }} 条
          <span class="settings__row-hint">导出 .ics</span>
        </span>
      </div>
      <div class="settings__row" @click="importEvents">
        <span class="settings__row-label">导入事件</span>
        <span class="settings__row-value">
          合并导入
          <span class="settings__row-hint">选择 .ics 文件</span>
        </span>
      </div>
    </div>

    <div v-if="debugStore.developerMode" class="settings__section">
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
      <div class="settings__row">
        <span class="settings__row-label">应用</span>
        <span class="settings__row-value">Kanadere</span>
      </div>
      <div class="settings__row">
        <span class="settings__row-label">设计</span>
        <span class="settings__row-value">Material Design 3</span>
      </div>
      <div class="settings__row" @click="onVersionTap">
        <span class="settings__row-label">版本</span>
        <span class="settings__row-value">
          <span class="settings__version">v{{ appVersion }}</span>
        </span>
      </div>
      <div class="settings__row">
        <span class="settings__row-label">版权与协议</span>
        <span class="settings__row-value">© 2026 fuyurost · AGPL-3.0</span>
      </div>
    </div>

    <!-- 配色下拉面板 -->
    <Transition name="scheme-panel">
      <div
        v-if="schemeOpen"
        ref="schemePanelEl"
        class="settings__scheme-panel"
        role="listbox"
        :aria-label="'选择配色'"
        :style="schemePanelStyle"
      >
        <button
          v-for="s in COLOR_SCHEMES"
          :key="s.id"
          type="button"
          role="option"
          :aria-selected="store.colorScheme === s.id"
          class="settings__scheme-option"
          :class="{ 'settings__scheme-option--active': store.colorScheme === s.id }"
          @click="pickScheme(s.id)"
        >
          <span class="settings__scheme-dot settings__scheme-dot--lg" :style="{ background: s.swatch }" />
          <span>{{ s.name }}</span>
        </button>
      </div>
    </Transition>

    <!-- 开发者模式解锁确认 -->
    <Transition name="dev-confirm">
      <div v-if="showDevConfirm" class="dev-confirm">
        <div class="dev-confirm__card" role="dialog" aria-modal="true" aria-label="开发者模式确认">
          <p class="dev-confirm__title">仅供开发使用，后果自负</p>
          <p class="dev-confirm__desc">将显示调试选项，请谨慎操作。</p>
          <div class="dev-confirm__actions">
            <button class="dev-confirm__btn" @click="showDevConfirm = false">取消</button>
            <button class="dev-confirm__btn dev-confirm__btn--filled" @click="confirmDevMode">继续</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 数据导入结果提示 -->
    <Transition name="dev-confirm">
      <div v-if="dataNotice" class="dev-confirm" @click.self="dataNotice = null">
        <div class="dev-confirm__card" role="dialog" aria-modal="true" aria-label="导入结果">
          <p class="dev-confirm__title" :class="{ 'dev-confirm__title--ok': dataNotice.ok }">
            {{ dataNotice.ok ? '导入完成' : '导入失败' }}
          </p>
          <p class="dev-confirm__desc">{{ dataNotice.message }}</p>
          <div class="dev-confirm__actions">
            <button class="dev-confirm__btn dev-confirm__btn--filled" @click="dataNotice = null">好</button>
          </div>
        </div>
      </div>
    </Transition>

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

/* ── 配色下拉选择器 ── */
.settings__scheme-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-sm);
  cursor: pointer;
}
.settings__scheme-dot {
  width: 16px;
  height: 16px;
  border-radius: var(--md-sys-shape-corner-full);
  flex-shrink: 0;
}
.settings__scheme-dot--lg {
  width: 30px;
  height: 30px;
}
.settings__scheme-panel {
  position: fixed;
  z-index: 30;
  width: 200px;
  padding: 6px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-md);
  box-shadow: var(--md-sys-elevation-3);
}
.settings__scheme-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--md-sys-shape-corner-sm);
  font: var(--md-sys-typescale-body-medium);
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.settings__scheme-option:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent);
}
.settings__scheme-option--active {
  background: color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent);
}
.scheme-panel-enter-active {
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate),
              transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate);
}
.scheme-panel-leave-active {
  transition: opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate),
              transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}
.scheme-panel-enter-from,
.scheme-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

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

.settings__version {
  cursor: default; /* 继承行 value 样式；连点解锁 */
}

/* ── 开发者模式解锁确认弹窗（与事件对话框同款 MD3 开合动画）── */
.dev-confirm {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 40%, transparent);
}
.dev-confirm-enter-active {
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate);
}
.dev-confirm-leave-active {
  transition: opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}
.dev-confirm-enter-from,
.dev-confirm-leave-to {
  opacity: 0;
}
.dev-confirm-enter-active .dev-confirm__card {
  transition: transform var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized-decelerate);
}
.dev-confirm-leave-active .dev-confirm__card {
  transition: transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}
.dev-confirm-enter-from .dev-confirm__card,
.dev-confirm-leave-to .dev-confirm__card {
  transform: scale(0.9);
}

/* ── 开发者模式解锁确认弹窗 ── */
.dev-confirm__card {
  width: min(360px, calc(100vw - 48px));
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  background: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-lg);
}
.dev-confirm__title {
  font: var(--md-sys-typescale-title-medium);
  color: var(--md-sys-color-error);
}
.dev-confirm__title--ok { color: var(--md-sys-color-primary); }
.dev-confirm__desc {
  font: var(--md-sys-typescale-body-medium);
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.6;
}
.dev-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.dev-confirm__btn {
  font: var(--md-sys-typescale-label-large);
  color: var(--md-sys-color-primary);
  padding: 8px 16px;
  border-radius: var(--md-sys-shape-corner-full);
  transition: background var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
.dev-confirm__btn:hover {
  background: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
}
.dev-confirm__btn--filled {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.dev-confirm__btn--filled:hover {
  background: var(--md-sys-color-primary);
  filter: brightness(1.08);
}
</style>

