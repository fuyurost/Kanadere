/** 日期类型（const 对象 + 联合类型，满足 erasableSyntaxOnly） */
export const DayType = {
  Holiday: 'holiday',
  AdjustedWorkday: 'adjusted',
  Weekend: 'weekend',
  Workday: 'workday',
} as const

export type DayType = (typeof DayType)[keyof typeof DayType]

export interface HolidayEntry {
  name: string
  range: [string, string]
}

export interface YearHolidayData {
  year: number
  holidays: HolidayEntry[]
  adjustedWorkdays: string[]
}
