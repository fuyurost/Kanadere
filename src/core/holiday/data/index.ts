import type { YearHolidayData } from '../types'
import { data2025 } from './2025'
import { data2026 } from './2026'
import { data2027 } from './2027'

const dataMap: Record<number, YearHolidayData> = { 2025: data2025, 2026: data2026, 2027: data2027 }

/** No-op data used when no holiday info is available for a given year. */
export const EMPTY_HOLIDAY_DATA: YearHolidayData = {
  year: 0,
  holidays: [],
  adjustedWorkdays: [],
}

export function getHolidayData(year: number): YearHolidayData {
  return dataMap[year] ?? EMPTY_HOLIDAY_DATA
}
