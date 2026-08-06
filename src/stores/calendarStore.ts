import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ViewMode } from '../core/calendar/types'
import { generateSchemeFromSeed } from '../core/color/scheme'
import { contrastForeground } from '../core/color/contrast'
import { enabledFestivalCategories } from '../core/holiday/engine'
import { FestivalCategory } from '../core/holiday/types'
import type { FestivalCategory as FestivalCategoryType } from '../core/holiday/types'

export type AppView = 'month' | 'settings'
export type Theme = 'dark' | 'light'
export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'dynamic'
type NavDirection = 'forward' | 'backward'

const PREFS_KEY = 'kanadere.preferences.v1'
const COLOR_SCHEMES: ColorScheme[] = ['blue', 'green', 'purple', 'orange', 'dynamic']

/** 节日开关默认值（全部显示为节假日） */
function defaultFestivalToggles(): Record<FestivalCategoryType, boolean> {
  return {
    [FestivalCategory.Statutory]: true,
    [FestivalCategory.Traditional]: true,
    [FestivalCategory.Western]: true,
  }
}

/** 读取持久化节日开关：缺失/非布尔 → true（旧版本数据无此字段时全部默认开启） */
function parseFestivalToggles(raw: unknown): Record<FestivalCategoryType, boolean> {
  const toggles = defaultFestivalToggles()
  if (typeof raw !== 'object' || raw === null) return toggles
  const obj = raw as Record<string, unknown>
  for (const key of Object.keys(FestivalCategory)) {
    const v = obj[key]
    if (typeof v === 'boolean') toggles[key as FestivalCategoryType] = v
  }
  return toggles
}

/** 动态取色时覆盖的 CSS 变量（与 tokens.css 静态方案同组） */
const SCHEME_CSS_VARS = [
  '--md-sys-color-primary',
  '--md-sys-color-on-primary',
  '--md-sys-color-primary-container',
  '--md-sys-color-on-primary-container',
  '--md-sys-color-inverse-primary',
] as const

/** 背景图片 dataURL 前缀校验（downscaleBackground 产出 image/jpeg） */
const BG_DATAURL_RE = /^data:image\/(png|jpe?g|webp);base64,/

/** 节日颜色可自定义的三个类别（调休保持 inverse 系，不开放） */
const FESTIVAL_COLOR_KEYS: FestivalCategoryType[] = [
  FestivalCategory.Statutory,
  FestivalCategory.Traditional,
  FestivalCategory.Western,
]

/** 节日颜色覆盖的 CSS 变量（tokens.css 提供默认值，store 内联覆盖时跟随） */
const FESTIVAL_COLOR_CSS_VARS: Record<FestivalCategoryType, string> = {
  [FestivalCategory.Statutory]: '--app-festival-statutory',
  [FestivalCategory.Traditional]: '--app-festival-traditional',
  [FestivalCategory.Western]: '--app-festival-western',
}
const FESTIVAL_COLOR_FG_CSS_VARS: Record<FestivalCategoryType, string> = {
  [FestivalCategory.Statutory]: '--app-festival-statutory-fg',
  [FestivalCategory.Traditional]: '--app-festival-traditional-fg',
  [FestivalCategory.Western]: '--app-festival-western-fg',
}

interface Prefs {
  theme: Theme
  weekStartsOn: 0 | 1
  colorScheme: ColorScheme
  dynamicSeed: string | null
  festivalToggles: Record<FestivalCategoryType, boolean>
  backgroundImage: string | null
  backgroundEnabled: boolean
  backgroundDim: number
  backgroundBlur: number
  festivalColors: Partial<Record<FestivalCategoryType, string>>
}

/** 数字钳制：缺失/非有限数 → 默认值 */
function clampNumber(raw: unknown, min: number, max: number, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? Math.min(max, Math.max(min, raw))
    : fallback
}

/** 读取持久化节日颜色：仅接受合法 '#RRGGBB'，其余键值忽略（损坏降级） */
function parseFestivalColors(raw: unknown): Partial<Record<FestivalCategoryType, string>> {
  const colors: Partial<Record<FestivalCategoryType, string>> = {}
  if (typeof raw !== 'object' || raw === null) return colors
  const obj = raw as Record<string, unknown>
  for (const key of FESTIVAL_COLOR_KEYS) {
    const v = obj[key]
    if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) colors[key] = v
  }
  return colors
}

/** 读取持久化偏好（主题/周起始日/配色/动态种子色/节日开关/背景/节日颜色）；损坏或缺失降级为默认 */
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
        festivalToggles: parseFestivalToggles(p.festivalToggles),
        backgroundImage:
          typeof p.backgroundImage === 'string' && BG_DATAURL_RE.test(p.backgroundImage)
            ? p.backgroundImage
            : null,
        backgroundEnabled: p.backgroundEnabled === true,
        backgroundDim: clampNumber(p.backgroundDim, 0, 100, 40),
        backgroundBlur: clampNumber(p.backgroundBlur, 0, 20, 0),
        festivalColors: parseFestivalColors(p.festivalColors),
      }
    }
  } catch {
    // 损坏数据降级
  }
  return {
    theme: 'dark',
    weekStartsOn: 1,
    colorScheme: 'blue',
    dynamicSeed: null,
    festivalToggles: defaultFestivalToggles(),
    backgroundImage: null,
    backgroundEnabled: false,
    backgroundDim: 40,
    backgroundBlur: 0,
    festivalColors: {},
  }
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
  const festivalToggles = ref<Record<FestivalCategoryType, boolean>>(prefs.festivalToggles)
  const backgroundImage = ref<string | null>(prefs.backgroundImage)
  const backgroundEnabled = ref<boolean>(prefs.backgroundEnabled)
  const backgroundDim = ref<number>(prefs.backgroundDim)
  const backgroundBlur = ref<number>(prefs.backgroundBlur)
  const festivalColors = ref<Partial<Record<FestivalCategoryType, string>>>(prefs.festivalColors)
  const navDirection = ref<NavDirection>('forward')
  const viewMode = ref<ViewMode>('month')

  /** 启用的节日类别集合（供日历引擎过滤，替换对象时自动更新） */
  const enabledCategories = computed(() => enabledFestivalCategories(festivalToggles.value))

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

  /** 图片背景：开关开且有图 → html[data-background] + 内联 CSS 变量；否则移除属性与变量 */
  function applyBackground() {
    const root = document.documentElement
    if (!backgroundEnabled.value || !backgroundImage.value) {
      root.removeAttribute('data-background')
      root.style.removeProperty('--app-bg-image')
      root.style.removeProperty('--app-bg-dim')
      root.style.removeProperty('--app-bg-blur')
      return
    }
    root.setAttribute('data-background', '')
    root.style.setProperty('--app-bg-image', `url("${backgroundImage.value}")`)
    root.style.setProperty('--app-bg-dim', String(backgroundDim.value))
    root.style.setProperty('--app-bg-blur', `${backgroundBlur.value}px`)
  }

  /** 节日颜色：内联覆盖别名（-fg 由对比度函数派生）；null 类别移除覆盖回落到方案色 */
  function applyFestivalColors() {
    const root = document.documentElement
    for (const key of FESTIVAL_COLOR_KEYS) {
      const hex = festivalColors.value[key]
      if (hex) {
        root.style.setProperty(FESTIVAL_COLOR_CSS_VARS[key], hex)
        root.style.setProperty(FESTIVAL_COLOR_FG_CSS_VARS[key], contrastForeground(hex))
      } else {
        root.style.removeProperty(FESTIVAL_COLOR_CSS_VARS[key])
        root.style.removeProperty(FESTIVAL_COLOR_FG_CSS_VARS[key])
      }
    }
  }

  watch(
    [
      theme,
      colorScheme,
      dynamicSeed,
      festivalToggles,
      backgroundImage,
      backgroundEnabled,
      backgroundDim,
      backgroundBlur,
      festivalColors,
    ],
    () => {
      applyDynamicScheme()
      applyBackground()
      applyFestivalColors()
      try {
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            theme: theme.value,
            weekStartsOn: weekStartsOn.value,
            colorScheme: colorScheme.value,
            dynamicSeed: dynamicSeed.value,
            festivalToggles: festivalToggles.value,
            backgroundImage: backgroundImage.value,
            backgroundEnabled: backgroundEnabled.value,
            backgroundDim: backgroundDim.value,
            backgroundBlur: backgroundBlur.value,
            festivalColors: festivalColors.value,
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

  /** 切换节日类别开关（整体替换对象，保证持久化 watch 触发） */
  function setFestivalToggle(category: FestivalCategoryType, enabled: boolean) {
    festivalToggles.value = { ...festivalToggles.value, [category]: enabled }
  }

  /** 背景图片：设置压缩后 dataURL（null 移除）；开关状态由调用方另行控制 */
  function setBackgroundImage(dataUrl: string | null) {
    backgroundImage.value = dataUrl
  }

  function setBackgroundEnabled(enabled: boolean) {
    backgroundEnabled.value = enabled
  }

  function setBackgroundDim(dim: number) {
    backgroundDim.value = Math.min(100, Math.max(0, dim))
  }

  function setBackgroundBlur(blur: number) {
    backgroundBlur.value = Math.min(20, Math.max(0, blur))
  }

  /** 节日颜色：hex 自定义该类别；null 恢复该类别默认（移除覆盖回落到方案色） */
  function setFestivalColor(category: FestivalCategoryType, hex: string | null) {
    if (hex !== null && !/^#[0-9a-fA-F]{6}$/.test(hex)) return
    if (hex === null) {
      if (!festivalColors.value[category]) return // 已是默认，避免无谓写盘
      const next = { ...festivalColors.value }
      delete next[category]
      festivalColors.value = next
    } else {
      festivalColors.value = { ...festivalColors.value, [category]: hex }
    }
  }

  /** 恢复全部节日颜色为默认（非破坏性） */
  function resetFestivalColors() {
    festivalColors.value = {}
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
    festivalToggles.value = defaultFestivalToggles()
    backgroundImage.value = null
    backgroundEnabled.value = false
    backgroundDim.value = 40
    backgroundBlur.value = 0
    festivalColors.value = {}
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
    festivalToggles,
    backgroundImage,
    backgroundEnabled,
    backgroundDim,
    backgroundBlur,
    festivalColors,
    enabledCategories,
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
    setFestivalToggle,
    setBackgroundImage,
    setBackgroundEnabled,
    setBackgroundDim,
    setBackgroundBlur,
    setFestivalColor,
    resetFestivalColors,
  }
})
