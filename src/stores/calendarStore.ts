import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ViewMode } from '../core/calendar/types'

export type AppView = 'month' | 'settings'
export type Theme = 'dark' | 'light'
type NavDirection = 'forward' | 'backward'

export const useCalendarStore = defineStore('calendar', () => {
  const currentView = ref<AppView>('month')
  const currentDate = ref(new Date())
  const selectedDate = ref<Date | null>(null)
  const weekStartsOn = ref<0 | 1>(1)
  const theme = ref<Theme>('dark')
  const navDirection = ref<NavDirection>('forward')
  const viewMode = ref<ViewMode>('month')

  watch(theme, (t) => {
    document.documentElement.setAttribute('data-theme', t)
  }, { immediate: true })

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

  /** 恢复全部默认状态（开发者调试/一键重置） */
  function reset() {
    currentView.value = 'month'
    currentDate.value = new Date()
    selectedDate.value = null
    weekStartsOn.value = 1
    theme.value = 'dark'
    navDirection.value = 'forward'
    viewMode.value = 'month'
  }

  return {
    currentView,
    currentDate,
    selectedDate,
    weekStartsOn,
    theme,
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
  }
})
