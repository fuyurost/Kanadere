import { startOfMonth, startOfWeek, addDays, isSameMonth } from 'date-fns'
import type { DayType, YearHolidayData } from '../holiday/types'
import { resolveDayType, getHolidayName } from '../holiday/engine'
import type { DateCell, DayGrid, MonthGrid, WeekGrid } from './types'

const WEEKS_IN_MONTH_VIEW = 6
const DAYS_PER_WEEK = 7
const TOTAL_CELLS = WEEKS_IN_MONTH_VIEW * DAYS_PER_WEEK // 42

/**
 * 生成月视图网格（固定 6×7 = 42 格）。
 *
 * @param year    年份
 * @param month   月份 1–12
 * @param data    节假日数据
 * @param weekStartsOn  0=周日 1=周一，默认周一
 */
export function generateMonthGrid(
  year: number,
  month: number,
  data: YearHolidayData,
  weekStartsOn: 0 | 1 = 1,
): MonthGrid {
  const firstOfMonth = startOfMonth(new Date(year, month - 1, 1))
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn })

  const cells: DateCell[] = []

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const date = addDays(gridStart, i)
    const dayType: DayType = resolveDayType(date, data)
    const currentMonth = isSameMonth(date, firstOfMonth)

    cells.push({
      date,
      dayType,
      isCurrentMonth: currentMonth,
      holidayName: dayType === 'holiday' ? getHolidayName(date, data) : undefined,
    })
  }

  return { year, month, cells }
}

/**
 * 生成周视图数据：包含 date 所在周的 7 天。
 */
export function generateWeekGrid(
  date: Date,
  data: YearHolidayData,
  weekStartsOn: 0 | 1 = 1,
): WeekGrid {
  const weekStart = startOfWeek(date, { weekStartsOn })
  const days: DateCell[] = []

  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i)
    const dayType: DayType = resolveDayType(d, data)
    days.push({
      date: d,
      dayType,
      isCurrentMonth: true,
      holidayName: dayType === 'holiday' ? getHolidayName(d, data) : undefined,
    })
  }

  return { year: weekStart.getFullYear(), month: weekStart.getMonth() + 1, weekStart, days }
}

/** 生成日视图数据（单日 + 节假日解析）。 */
export function generateDayCell(date: Date, data: YearHolidayData): DayGrid {
  const dayType: DayType = resolveDayType(date, data)
  return {
    cell: {
      date,
      dayType,
      isCurrentMonth: true,
      holidayName: dayType === 'holiday' ? getHolidayName(date, data) : undefined,
    },
  }
}
