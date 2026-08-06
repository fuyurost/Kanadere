import { isWeekend, isWithinInterval } from 'date-fns'
import { DayType } from './types'
import type { FestivalCategory, HolidayEntry, YearHolidayData } from './types'

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/**
 * 从设置开关对象挑出启用的节日类别。
 * @param toggles 类别 → 是否显示为节假日
 */
export function enabledFestivalCategories(
  toggles: Record<FestivalCategory, boolean>,
): ReadonlySet<FestivalCategory> {
  return new Set(
    (Object.keys(toggles) as FestivalCategory[]).filter((c) => toggles[c] === true),
  )
}

/**
 * 返回匹配的节假日条目（第一个匹配，遵守 enabled 类别过滤）；无匹配返回 undefined。
 * 名称与类别解析共用此函数，保证两者来自同一条目。
 */
export function getHolidayEntry(
  date: Date,
  data: YearHolidayData,
  enabled?: ReadonlySet<FestivalCategory>,
): HolidayEntry | undefined {
  const d = toDateOnly(date)

  for (const h of data.holidays) {
    if (enabled !== undefined && !enabled.has(h.category)) continue
    const start = parseYMD(h.range[0])
    const end = parseYMD(h.range[1])
    if (isWithinInterval(d, { start, end })) {
      return h
    }
  }

  return undefined
}

/**
 * 解析指定日期的类型。
 * 优先级：Holiday > AdjustedWorkday > Weekend > Workday
 *
 * @param enabled 启用的节日类别集合；缺省/undefined = 全部启用（与旧行为一致）
 */
export function resolveDayType(
  date: Date,
  data: YearHolidayData,
  enabled?: ReadonlySet<FestivalCategory>,
): DayType {
  if (getHolidayEntry(date, data, enabled) !== undefined) return DayType.Holiday

  const d = toDateOnly(date)

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
 *
 * @param enabled 启用的节日类别集合；缺省/undefined = 全部启用
 */
export function getHolidayName(
  date: Date,
  data: YearHolidayData,
  enabled?: ReadonlySet<FestivalCategory>,
): string | undefined {
  return getHolidayEntry(date, data, enabled)?.name
}

/**
 * 返回节假日类别（与 getHolidayName 同一条目），非节假日返回 undefined。
 *
 * @param enabled 启用的节日类别集合；缺省/undefined = 全部启用
 */
export function getHolidayCategory(
  date: Date,
  data: YearHolidayData,
  enabled?: ReadonlySet<FestivalCategory>,
): FestivalCategory | undefined {
  return getHolidayEntry(date, data, enabled)?.category
}
