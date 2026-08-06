/** 日期类型（const 对象 + 联合类型，满足 erasableSyntaxOnly） */
export const DayType = {
  Holiday: 'holiday',
  AdjustedWorkday: 'adjusted',
  Weekend: 'weekend',
  Workday: 'workday',
} as const

export type DayType = (typeof DayType)[keyof typeof DayType]

/** 节日类别（设置页三组独立开关） */
export const FestivalCategory = {
  Statutory: 'statutory',
  Traditional: 'traditional',
  Western: 'western',
} as const

export type FestivalCategory = (typeof FestivalCategory)[keyof typeof FestivalCategory]

export interface HolidayEntry {
  name: string
  range: [string, string]
  category: FestivalCategory
}

export interface YearHolidayData {
  year: number
  holidays: HolidayEntry[]
  adjustedWorkdays: string[]
}
