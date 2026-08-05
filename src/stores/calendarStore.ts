import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ViewMode } from '../core/calendar/types'
import { generateSchemeFromSeed } from '../core/color/scheme'

export type AppView = 'month' | 'settings'
export type Theme = 'dark' | 'light'
export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'dynamic'
type NavDirection = 'forward' | 'backward'

const PREFS_KEY = 'kanadere.preferences.v1'
const COLOR_SCHEMES: ColorScheme[] = ['blue', 'green', 'purple', 'orange', 'dynamic']

/** 动态取色时覆盖的 CSS 变量（与 tokens.css 静态方案同组） */
const SCHEME_CSS_VARS = [
  '--md-sys-color-primary',
  '--md-sys-color-on-primary',
  '--md-sys-color-primary-container',
  '--md-sys-color-on-primary-container',
  '--md-sys-color-inverse-primary',
] as const

interface Prefs {
  theme: Theme
  weekStartsOn: 0 | 1
  colorScheme: ColorScheme
  dynamicSeed: string | null
}

/** 读取持久化偏好（主题/周起始日/配色/动态种子色）；损坏或缺失降级为默认 */
function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>
      return {
        theme: p.theme === 'light' ? 'light' : 'dark',
        weekStartsOn: p.weekStartsOn === 0 ? 0 : 1,
        colorScheme: COLOR_SCHEMES.includes(p.colorScheme as ColorScheme)
          ? (p.colorScheme as ColorScheme)
          : 'blue',
        dynamicSeed:
          typeof p.dynamicSeed === 'string' && /^#[0-9a-fA-F]{6}$/.test(p.dynamicSeed)
            ? p.dynamicSeed
            : null,
      }
    }
  } catch {
    // 损坏数据降级
  }
  return { theme: 'dark', weekStartsOn: 1, colorScheme: 'blue', dynamicSeed: null }
}

export const useCalendarStore = defineStore('calendar', () => {
  const prefs = loadPrefs()
  const currentView = ref<AppView>('month')
  const currentDate = ref(new Date())
  const selectedDate = ref<Date | null>(null)
  const weekStartsOn = ref<0 | 1>(prefs.weekStartsOn)
  const theme = ref<Theme>(prefs.theme)
  const colorScheme = ref<ColorScheme>(prefs.colorScheme)
  const dynamicSeed = ref<string | null>(prefs.dynamicSeed)
  const navDirection = ref<NavDirection>('forward')
  const viewMode = ref<ViewMode>('month')

  /** 动态取色：seed → 当前主题色板 → 覆盖 CSS 变量；静态方案则清除覆盖 */
  function applyDynamicScheme() {
    const root = document.documentElement
    if (colorScheme.value !== 'dynamic' || !dynamicSeed.value) {
      for (const v of SCHEME_CSS_VARS) root.style.removeProperty(v)
      return
    }
    const palette = generateSchemeFromSeed(dynamicSeed.value)[theme.value]
    const entries = [
      'primary',
      'onPrimary',
      'primaryContainer',
      'onPrimaryContainer',
      'inversePrimary',
    ] as const
    for (let i = 0; i < SCHEME_CSS_VARS.length; i++) {
      root.style.setProperty(SCHEME_CSS_VARS[i]!, palette[entries[i]!])
    }
  }

  watch(theme, (t) => {
    document.documentElement.setAttribute('data-theme', t)
  }, { immediate: true })

  watch(colorScheme, (s) => {
    document.documentElement.setAttribute('data-scheme', s === 'dynamic' ? 'blue' : s)
  }, { immediate: true })

  watch(
    [theme, colorScheme, dynamicSeed],
    () => {
      applyDynamicScheme()
      try {
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            theme: theme.value,
            weekStartsOn: weekStartsOn.value,
            colorScheme: colorScheme.value,
            dynamicSeed: dynamicSeed.value,
          }),
        )
      } catch {
        // 存储不可用时仅影响本次会话
      }
    },
    { immediate: true },
  )

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
    if (selectedDate.value === null) {
      selectedDate.value = new Date()
    }
  }

  function goToYear(year: number) {
    navDirection.value = year > currentDate.value.getFullYear() ? 'forward' : 'backward'
    const d = currentDate.value
    currentDate.value = new Date(year, d.getMonth(), d.getDate())
  }

  function goNext() {
    navDirection.value = 'forward'
    const d = currentDate.value
    switch (viewMode.value) {
      case 'month':
        currentDate.value = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        break
      case 'week':
        currentDate.value = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
        break
      case 'day':
        currentDate.value = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
        break
    }
  }

  function goPrev() {
    navDirection.value = 'backward'
    const d = currentDate.value
    switch (viewMode.value) {
      case 'month':
        currentDate.value = new Date(d.getFullYear(), d.getMonth() - 1, 1)
        break
      case 'week':
        currentDate.value = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)
        break
      case 'day':
        currentDate.value = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
        break
    }
  }

  function goToToday() {
    const now = new Date()
    navDirection.value = now >= currentDate.value ? 'forward' : 'backward'
    currentDate.value = now
  }

  function goToDate(date: Date) {
    const cur = currentDate.value
    navDirection.value = date >= cur ? 'forward' : 'backward'
    if (viewMode.value === 'month') {
      currentDate.value = new Date(date.getFullYear(), date.getMonth(), 1)
    } else {
      currentDate.value = new Date(date)
    }
    selectedDate.value = new Date(date)
  }

  function selectDate(date: Date) {
    const cur = currentDate.value
    if (viewMode.value === 'month') {
      if (date.getFullYear() !== cur.getFullYear() || date.getMonth() !== cur.getMonth()) {
        navDirection.value = date >= cur ? 'forward' : 'backward'
        currentDate.value = new Date(date.getFullYear(), date.getMonth(), 1)
      }
    }
    selectedDate.value = date
  }

  function navigateSelection(dir: 'prevDay' | 'nextDay' | 'prevWeek' | 'nextWeek') {
    const base = selectedDate.value ?? currentDate.value
    const d = new Date(base)
    switch (dir) {
      case 'prevDay':  d.setDate(d.getDate() - 1); break
      case 'nextDay':  d.setDate(d.getDate() + 1); break
      case 'prevWeek': d.setDate(d.getDate() - 7); break
      case 'nextWeek': d.setDate(d.getDate() + 7); break
    }
    selectedDate.value = d
    const cur = currentDate.value
    if (viewMode.value === 'month') {
      // 月视图：选区跨出当前月时自动切月（页面跟随）
      if (d.getFullYear() !== cur.getFullYear() || d.getMonth() !== cur.getMonth()) {
        navDirection.value = d >= cur ? 'forward' : 'backward'
        currentDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
      }
    } else {
      // 周/日视图：选区移动时视图跟随
      navDirection.value = d >= cur ? 'forward' : 'backward'
      currentDate.value = new Date(d)
    }
  }

  function toggleWeekStartsOn() {
    weekStartsOn.value = weekStartsOn.value === 0 ? 1 : 0
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setColorScheme(scheme: ColorScheme) {
    colorScheme.value = scheme
  }

  /** 动态取色：记录种子色并切换到 dynamic 方案 */
  function setDynamicSeed(seedHex: string) {
    dynamicSeed.value = seedHex
    colorScheme.value = 'dynamic'
  }

  /** 恢复全部默认状态（开发者调试/一键重置） */
  function reset() {
    currentView.value = 'month'
    currentDate.value = new Date()
    selectedDate.value = null
    weekStartsOn.value = 1
    theme.value = 'dark'
    colorScheme.value = 'blue'
    dynamicSeed.value = null
    navDirection.value = 'forward'
    viewMode.value = 'month'
  }

  return {
    currentView,
    currentDate,
    selectedDate,
    weekStartsOn,
    theme,
    colorScheme,
    dynamicSeed,
    navDirection,
    viewMode,
    reset,
    setViewMode,
    goNext,
    goPrev,
    goToYear,
    goToToday,
    goToDate,
    selectDate,
    navigateSelection,
    toggleWeekStartsOn,
    toggleTheme,
    setColorScheme,
    setDynamicSeed,
  }
})
