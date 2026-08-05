import { format, parse, addDays, addWeeks } from 'date-fns'
import type { CalendarEvent, EventOccurrence, EventDraft, TimeBlockLayout } from './types'
import { RecurrenceFrequency } from './types'

/** Date → 'yyyy-MM-dd'（本地时区） */
export function dateToKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** 'yyyy-MM-dd' → Date（本地时区） */
export function keyToDate(key: string): Date {
  return parse(key, 'yyyy-MM-dd', new Date())
}

/**
 * 展开事件在 [rangeStart, rangeEnd] 内的所有发生（含边界）。
 *
 * 重复规则语义（RRULE BYMONTHDAY）：
 * - monthly 遇 31 号等短月不存在的日期、yearly 遇 2 月 29 非闰年 → 跳过该次，不 clamp 不漂移
 * - until 边界含当日
 */
export function expandOccurrences(
  event: CalendarEvent,
  rangeStart: string,
  rangeEnd: string,
): EventOccurrence[] {
  // 无重复：仅当锚定日期在范围内时返回单次
  if (!event.recurrence) {
    if (event.date >= rangeStart && event.date <= rangeEnd) {
      return [{ event, date: event.date }]
    }
    return []
  }

  const { frequency, interval, until } = event.recurrence
  const anchor = keyToDate(event.date)
  const occurrences: EventOccurrence[] = []

  for (let k = 0; ; k++) {
    let d: Date
    if (frequency === RecurrenceFrequency.Daily) {
      d = addDays(anchor, k * interval)
    } else if (frequency === RecurrenceFrequency.Weekly) {
      d = addWeeks(anchor, k * interval)
    } else if (frequency === RecurrenceFrequency.Monthly) {
      const m = anchor.getMonth() + k * interval
      const y = anchor.getFullYear() + Math.floor(m / 12)
      const mo = m % 12
      d = new Date(y, mo, anchor.getDate())
      // 31 号遇短月等：Date 会滚动到下月，日期不一致即无效，跳过该次
      if (d.getDate() !== anchor.getDate()) continue
    } else {
      const y = anchor.getFullYear() + k * interval
      d = new Date(y, anchor.getMonth(), anchor.getDate())
      // 2 月 29 日遇非闰年：跳过
      if (d.getDate() !== anchor.getDate()) continue
    }

    const key = dateToKey(d)
    if (until && key > until) break
    if (key > rangeEnd) break
    if (key < rangeStart) continue
    occurrences.push({ event, date: key })
  }

  return occurrences
}

/** 排序：日期升序；同日 allDay 在前；再按 startTime 升序（缺 startTime 视为全天） */
function compareOccurrences(a: EventOccurrence, b: EventOccurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  const aAllDay = a.event.allDay || !a.event.startTime
  const bAllDay = b.event.allDay || !b.event.startTime
  if (aAllDay !== bAllDay) return aAllDay ? -1 : 1
  const aStart = a.event.startTime ?? ''
  const bStart = b.event.startTime ?? ''
  if (aStart !== bStart) return aStart < bStart ? -1 : 1
  return 0
}

/** 返回 [rangeStart, rangeEnd]（含边界）内的所有事件发生，已排序。 */
export function getEventsInRange(
  events: CalendarEvent[],
  rangeStart: string,
  rangeEnd: string,
): EventOccurrence[] {
  const occurrences: EventOccurrence[] = []
  for (const event of events) {
    occurrences.push(...expandOccurrences(event, rangeStart, rangeEnd))
  }
  occurrences.sort(compareOccurrences)
  return occurrences
}

/** 返回指定日期（'yyyy-MM-dd'）内的事件发生，已排序。 */
export function getEventsForDate(events: CalendarEvent[], dateKey: string): EventOccurrence[] {
  return getEventsInRange(events, dateKey, dateKey)
}

/** 从 fromKey 起（含当日）未来 horizonDays 天内的事件，取前 limit 条，已排序。 */
export function getUpcomingEvents(
  events: CalendarEvent[],
  fromKey: string,
  limit: number,
  horizonDays = 60,
): EventOccurrence[] {
  const end = dateToKey(addDays(keyToDate(fromKey), horizonDays))
  return getEventsInRange(events, fromKey, end).slice(0, limit)
}

/** 校验事件草稿：返回错误信息数组，合法时返回 []（首个错误优先）。 */
export function validateEvent(draft: EventDraft): string[] {
  // 日期无效
  const parsedDate = keyToDate(draft.date)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
    Number.isNaN(parsedDate.getTime()) ||
    dateToKey(parsedDate) !== draft.date
  ) {
    return ['日期无效']
  }
  // 标题不能为空
  if (!draft.title.trim()) return ['标题不能为空']
  // 非全天必须填写时间
  if (!draft.allDay) {
    if (!draft.startTime) return ['请填写开始时间']
    if (!draft.endTime) return ['请填写结束时间']
  }
  // 时间格式无效
  const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (draft.startTime && !timeRe.test(draft.startTime)) return ['时间格式无效']
  if (draft.endTime && !timeRe.test(draft.endTime)) return ['时间格式无效']
  // 结束时间需晚于开始时间（字符串比较即可）
  if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) {
    return ['结束时间需晚于开始时间']
  }
  // 重复间隔至少为 1
  if (draft.recurrence && (draft.recurrence.interval < 1 || !Number.isInteger(draft.recurrence.interval))) {
    return ['重复间隔至少为 1']
  }
  // 结束日期不能早于开始日期
  if (draft.recurrence?.until && draft.recurrence.until < draft.date) {
    return ['结束日期不能早于开始日期']
  }
  return []
}

/**
 * 时间块布局：过滤全天事件，按 (startMin, endMin) 升序贪心分 lane——
 * 每条找第一个 laneLastEnd <= startMin 的 lane，否则新建 lane。
 */
export function layoutTimeBlocks(occurrences: EventOccurrence[]): TimeBlockLayout[] {
  const timed = occurrences
    .filter((o) => !o.event.allDay && o.event.startTime != null && o.event.endTime != null)
    .map((o) => {
      const [sh, sm] = o.event.startTime!.split(':').map(Number)
      const [eh, em] = o.event.endTime!.split(':').map(Number)
      return { occurrence: o, startMin: sh * 60 + sm, endMin: eh * 60 + em }
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  const lanes: number[] = []
  const layouts: TimeBlockLayout[] = []

  for (const item of timed) {
    let lane = lanes.findIndex((lastEnd) => lastEnd <= item.startMin)
    if (lane === -1) {
      lane = lanes.length
      lanes.push(item.endMin)
    } else {
      lanes[lane] = item.endMin
    }
    layouts.push({
      occurrence: item.occurrence,
      topPercent: (item.startMin / 1440) * 100,
      heightPercent: Math.max(((item.endMin - item.startMin) / 1440) * 100, 1.2),
      laneIndex: lane,
      laneCount: 0,
    })
  }

  const laneCount = lanes.length
  for (const l of layouts) l.laneCount = laneCount
  return layouts
}
