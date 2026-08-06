import { computed } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'
import { generateMonthGrid } from '../core/calendar/engine'
import { getHolidayData } from '../core/holiday/data'
import type { FestivalCategory } from '../core/holiday/types'

export function useCalendar() {
  const store = useCalendarStore()

  const grid = computed(() => {
    const d = store.currentDate
    const year = d.getFullYear()
    const data = getHolidayData(year)
    return generateMonthGrid(year, d.getMonth() + 1, data, store.weekStartsOn, store.enabledCategories)
  })

  const yearMonth = computed(() => {
    const d = store.currentDate
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  return { grid, yearMonth, store }
}

/**
 * Standalone mini-calendar grid — does NOT read the store's currentDate.
 * @param enabled 启用的节日类别集合；缺省 = 全部启用
 */
export function useMiniCalendar(
  year: number,
  month: number,
  weekStartsOn: 0 | 1,
  enabled?: ReadonlySet<FestivalCategory>,
) {
  const data = getHolidayData(year)
  const grid = generateMonthGrid(year, month, data, weekStartsOn, enabled)
  return grid
}
