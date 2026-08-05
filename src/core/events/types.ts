/** 重复频率（const 对象 + 联合类型，满足 erasableSyntaxOnly，照抄 DayType 模式） */
export const RecurrenceFrequency = {
  Daily: 'daily',
  Weekly: 'weekly',
  Monthly: 'monthly',
  Yearly: 'yearly',
} as const

export type RecurrenceFrequency = (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency]

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  /** 每 N 个周期重复一次，>= 1 */
  interval: number
  /** 'YYYY-MM-DD'，含当日；缺省 = 永不结束 */
  until?: string
}

export interface CalendarEvent {
  id: string
  title: string
  /** 'YYYY-MM-DD' 锚定日期（本地时区，非 UTC） */
  date: string
  allDay: boolean
  /** 'HH:MM' 24h，!allDay 时必填 */
  startTime?: string
  /** 'HH:MM'，!allDay 时必填，必须 > startTime；仅限同日（不支持跨夜事件） */
  endTime?: string
  recurrence?: RecurrenceRule
}

export interface EventOccurrence {
  event: CalendarEvent
  /** 本次发生日期 'YYYY-MM-DD' */
  date: string
}

export type EventDraft = Omit<CalendarEvent, 'id'>

export interface TimeBlockLayout {
  occurrence: EventOccurrence
  /** startMin / 1440 * 100 */
  topPercent: number
  /** max(durationMin / 1440 * 100, 1.2) */
  heightPercent: number
  /** 0..laneCount-1，贪心分配 */
  laneIndex: number
  laneCount: number
}
