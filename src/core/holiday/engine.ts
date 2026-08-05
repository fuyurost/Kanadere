import { isWeekend, isWithinInterval } from 'date-fns'
import { DayType } from './types'
import type { YearHolidayData } from './types'

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/**
 * 解析指定日期的类型。
 * 优先级：Holiday > AdjustedWorkday > Weekend > Workday
 */
export function resolveDayType(date: Date, data: YearHolidayData): DayType {
  const d = toDateOnly(date)

  for (const h of data.holidays) {
    const start = parseYMD(h.range[0])
    const end = parseYMD(h.range[1])
    if (isWithinInterval(d, { start, end })) {
      return DayType.Holiday
    }
  }

  for (const s of data.adjustedWorkdays) {
    if (d.getTime() === parseYMD(s).getTime()) {
      return DayType.AdjustedWorkday
    }
  }

  if (isWeekend(d)) return DayType.Weekend

  return DayType.Workday
}

/**
 * 返回节假日名称，非节假日返回 undefined。
 */
export function getHolidayName(date: Date, data: YearHolidayData): string | undefined {
  const d = toDateOnly(date)

  if (resolveDayType(date, data) !== DayType.Holiday) return undefined

  for (const h of data.holidays) {
    const start = parseYMD(h.range[0])
    const end = parseYMD(h.range[1])
    if (isWithinInterval(d, { start, end })) {
      return h.name
    }
  }

  return undefined
}
