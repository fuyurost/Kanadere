import { startOfMonth, startOfWeek, addDays, isSameMonth } from 'date-fns'
import { DayType } from '../holiday/types'
import type { FestivalCategory, YearHolidayData } from '../holiday/types'
import { resolveDayType, getHolidayEntry } from '../holiday/engine'
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
 * @param enabled 启用的节日类别集合；缺省 = 全部启用
 */
export function generateMonthGrid(
  year: number,
  month: number,
  data: YearHolidayData,
  weekStartsOn: 0 | 1 = 1,
  enabled?: ReadonlySet<FestivalCategory>,
): MonthGrid {
  const firstOfMonth = startOfMonth(new Date(year, month - 1, 1))
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn })

  const cells: DateCell[] = []

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const date = addDays(gridStart, i)
    // 名称与类别从同一次 getHolidayEntry 调用取得；命中时直接为 Holiday，避免二次遍历
    const entry = getHolidayEntry(date, data, enabled)
    const dayType: DayType = entry !== undefined ? DayType.Holiday : resolveDayType(date, data, enabled)
    const currentMonth = isSameMonth(date, firstOfMonth)

    cells.push({
      date,
      dayType,
      isCurrentMonth: currentMonth,
      holidayName: entry?.name,
      holidayCategory: entry?.category,
    })
  }

  return { year, month, cells }
}

/**
 * 生成周视图数据：包含 date 所在周的 7 天。
 *
 * @param enabled 启用的节日类别集合；缺省 = 全部启用
 */
export function generateWeekGrid(
  date: Date,
  data: YearHolidayData,
  weekStartsOn: 0 | 1 = 1,
  enabled?: ReadonlySet<FestivalCategory>,
): WeekGrid {
  const weekStart = startOfWeek(date, { weekStartsOn })
  const days: DateCell[] = []

  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i)
    const entry = getHolidayEntry(d, data, enabled)
    const dayType: DayType = entry !== undefined ? DayType.Holiday : resolveDayType(d, data, enabled)
    days.push({
      date: d,
      dayType,
      isCurrentMonth: true,
      holidayName: entry?.name,
      holidayCategory: entry?.category,
    })
  }

  return { year: weekStart.getFullYear(), month: weekStart.getMonth() + 1, weekStart, days }
}

/** 生成日视图数据（单日 + 节假日解析）。 @param enabled 启用的节日类别集合；缺省 = 全部启用 */
export function generateDayCell(
  date: Date,
  data: YearHolidayData,
  enabled?: ReadonlySet<FestivalCategory>,
): DayGrid {
  const entry = getHolidayEntry(date, data, enabled)
  const dayType: DayType = entry !== undefined ? DayType.Holiday : resolveDayType(date, data, enabled)
  return {
    cell: {
      date,
      dayType,
      isCurrentMonth: true,
      holidayName: entry?.name,
      holidayCategory: entry?.category,
    },
  }
}
