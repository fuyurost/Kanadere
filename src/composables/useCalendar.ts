import { computed } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'
import { generateMonthGrid } from '../core/calendar/engine'
import { getHolidayData } from '../core/holiday/data'

export function useCalendar() {
  const store = useCalendarStore()

  const grid = computed(() => {
    const d = store.currentDate
    const year = d.getFullYear()
    const data = getHolidayData(year)
    return generateMonthGrid(year, d.getMonth() + 1, data, store.weekStartsOn)
  })

  const yearMonth = computed(() => {
    const d = store.currentDate
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  return { grid, yearMonth, store }
}

/** Standalone mini-calendar grid — does NOT read the store's currentDate. */
export function useMiniCalendar(year: number, month: number, weekStartsOn: 0 | 1) {
  const data = getHolidayData(year)
  const grid = generateMonthGrid(year, month, data, weekStartsOn)
  return grid
}
