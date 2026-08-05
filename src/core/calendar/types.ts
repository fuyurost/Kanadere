import type { DayType } from '../holiday/types'

export interface DateCell {
  date: Date
  dayType: DayType
  isCurrentMonth: boolean
  holidayName?: string
}

export type ViewMode = 'month' | 'week' | 'day'

export interface MonthGrid {
  year: number
  month: number
  cells: DateCell[]
}

/** 周视图数据：以某日为锚点的 7 天 */
export interface WeekGrid {
  year: number
  /** 周内首日所在月份 1–12（标题用） */
  month: number
  weekStart: Date
  days: DateCell[]
}

/** 日视图数据 */
export interface DayGrid {
  cell: DateCell
}
