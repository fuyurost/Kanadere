import { addDays } from 'date-fns'
import type { CalendarEvent, EventDraft, RecurrenceFrequency, RecurrenceRule } from './types'
import { dateToKey, keyToDate, validateEvent } from './engine'

/**
 * iCal (RFC 5545) 导入导出，零框架依赖。
 *
 * 设计约定：
 * - 时间一律输出为浮动本地时间（无 TZID / 无 Z 后缀），保持简单合法；
 * - DTSTAMP 为当前 UTC 时间；
 * - 全天事件 DTSTART;VALUE=DATE + DTEND 次日；非全天 DTSTART/DTEND 为 DATE-TIME；
 * - RRULE 的 UNTIL 按 DTSTART 值类型输出：全天 → DATE（YYYYMMDD），
 *   非全天 → 浮动 DATE-TIME 当日 23:59:59（包含 until 当天全部时刻，语义与
 *   engine 的「含当日」一致；RFC 5545 §3.3.10 要求 UNTIL 与 DTSTART 同值类型）。
 */

const CRLF = '\r\n'

/** 'YYYY-MM-DD' → 'YYYYMMDD'（RFC 5545 DATE 字面量，多处使用需保持同一格式） */
function toICalDate(dateKey: string): string {
  return dateKey.replace(/-/g, '')
}

/** 'YYYY-MM-DD' + 'HH:MM' 或 'HH:MM:SS' → 'YYYYMMDDTHHMMSS' */
function toICalDateTime(dateKey: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time
  return `${toICalDate(dateKey)}T${t.replace(/:/g, '')}`
}

/** 'YYYYMMDD' → 'YYYY-MM-DD'（解析处与 RRULE UNTIL 共用，保持同一格式） */
function toDateKey(digits: string): string {
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

/** RFC 5545 文本转义（反斜杠优先，其次换行、分号、逗号） */
function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

/** RFC 5545 文本反转义 */
function unescapeText(s: string): string {
  return s.replace(/\\([nN;,\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c))
}

/**
 * RFC 5545 行折叠：物理行不超过 75 字符（不含行尾 CRLF），
 * 续行以单个空格开头；首段 75 字符、后续每段 74 字符（续行空格计入行长）。
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chars = Array.from(line)
  const chunks: string[] = []
  let i = 0
  chunks.push(chars.slice(i, (i += 75)).join(''))
  while (i < chars.length) {
    chunks.push(chars.slice(i, (i += 74)).join(''))
  }
  return chunks.join(CRLF + ' ')
}

/** 导出全部事件为 RFC 5545 VCALENDAR 2.0 文本（每行 CRLF 结尾）。 */
export function generateICal(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kanadere//CN 2.0//EN',
    'CALSCALE:GREGORIAN',
  ]
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  for (const event of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(foldLine(`UID:${event.id}`))
    lines.push(`DTSTAMP:${stamp}`)
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toICalDate(event.date)}`)
      lines.push(`DTEND;VALUE=DATE:${toICalDate(dateToKey(addDays(keyToDate(event.date), 1)))}`)
    } else {
      lines.push(`DTSTART:${toICalDateTime(event.date, event.startTime ?? '00:00')}`)
      if (event.endTime) lines.push(`DTEND:${toICalDateTime(event.date, event.endTime)}`)
    }
    lines.push(foldLine(`SUMMARY:${escapeText(event.title)}`))
    if (event.recurrence) {
      lines.push(foldLine(toRRuleLine(event.recurrence, event.allDay)))
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join(CRLF) + CRLF
}

/** RecurrenceRule → 'RRULE:...' 行 */
function toRRuleLine(rule: RecurrenceRule, allDay: boolean): string {
  let line = `RRULE:FREQ=${rule.frequency.toUpperCase()}`
  if (rule.interval > 1) line += `;INTERVAL=${rule.interval}`
  if (rule.until) {
    line += allDay
      ? `;UNTIL=${toICalDate(rule.until)}`
      : `;UNTIL=${toICalDateTime(rule.until, '23:59:59')}`
  }
  return line
}

/** 单个解析出的属性（key 已大写） */
interface ParsedProperty {
  key: string
  value: string
}

/** 解析 'KEY;PARAM=..:VALUE' 行；无 ':' 视为无效行。 */
function parseProperty(line: string): ParsedProperty | null {
  const match = /^([^;:]+)(?:;[^:]*)?:(.*)$/.exec(line)
  if (!match) return null
  return { key: match[1].toUpperCase(), value: match[2] }
}

/** 折叠处理：CRLF/LF 归一化后，续行（空格/制表符开头）拼回上一行。 */
function unfoldLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines: string[] = []
  for (const raw of normalized.split('\n')) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += raw.slice(1)
    } else {
      lines.push(raw)
    }
  }
  return lines
}

/** 解析 DTSTART/DTEND 值：DATE（YYYYMMDD）或 DATE-TIME（YYYYMMDDTHHMMSS[Z]）；失败返回 null。 */
function parseDateOrDateTime(
  value: string,
): { allDay: boolean; date: string; time?: string } | null {
  const v = value.trim().replace(/Z$/i, '')
  if (/^\d{8}$/.test(v)) {
    return { allDay: true, date: toDateKey(v) }
  }
  const m = /^(\d{8})T(\d{6})$/.exec(v)
  if (m) {
    return {
      allDay: false,
      date: toDateKey(m[1]),
      time: `${m[2].slice(0, 2)}:${m[2].slice(2, 4)}`,
    }
  }
  return null
}

const FREQ_MAP: Record<string, RecurrenceFrequency> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
}

/** 解析 RRULE 的 FREQ/INTERVAL/UNTIL；无有效 FREQ 返回 null（事件仍按单次导入）。 */
function parseRRule(value: string): RecurrenceRule | null {
  const parts: Record<string, string> = {}
  for (const chunk of value.split(';')) {
    const eq = chunk.indexOf('=')
    if (eq === -1) continue
    parts[chunk.slice(0, eq).toUpperCase()] = chunk.slice(eq + 1)
  }
  const frequency = FREQ_MAP[(parts['FREQ'] ?? '').toUpperCase()]
  if (!frequency) return null
  const rule: RecurrenceRule = { frequency, interval: 1 }
  const interval = Number(parts['INTERVAL'])
  if (Number.isInteger(interval) && interval >= 1) rule.interval = interval
  const until = parts['UNTIL']
  if (until) {
    const datePart = /^(\d{8})/.exec(until.trim())
    if (datePart) rule.until = toDateKey(datePart[1])
  }
  return rule
}

/** 单个 VEVENT 属性表 → 草稿；缺 SUMMARY/DTSTART 或解析失败返回 null。 */
function parseVEvent(props: ParsedProperty[]): EventDraft | null {
  // 属性名来自外部输入（动态 key），用 Map 收集首个值
  const map = new Map<string, string>()
  for (const p of props) {
    if (!map.has(p.key)) map.set(p.key, p.value)
  }
  const summary = map.get('SUMMARY')
  const dtstart = map.get('DTSTART')
  if (summary === undefined || dtstart === undefined) return null
  const start = parseDateOrDateTime(dtstart)
  if (!start) return null

  const draft: EventDraft = {
    title: unescapeText(summary.trim()),
    date: start.date,
    allDay: start.allDay,
  }
  if (start.time) draft.startTime = start.time

  const dtend = map.get('DTEND')
  if (dtend !== undefined) {
    const end = parseDateOrDateTime(dtend)
    // 仅接受同日且晚于开始时间的 DATE-TIME 结束；跨日/缺失 → endTime 留空
    // （非全天缺 endTime 会被 validateEvent 过滤——引擎不支持跨夜事件）。
    if (end && !end.allDay && end.date === start.date && end.time && start.time && end.time > start.time) {
      draft.endTime = end.time
    }
  }

  const rrule = map.get('RRULE')
  if (rrule !== undefined) {
    const recurrence = parseRRule(rrule)
    if (recurrence) draft.recurrence = recurrence
  }
  return draft
}

/**
 * 解析 iCal 文本 → 事件草稿数组（不含 id，id 由调用方生成）。
 * 大小写不敏感、忽略未知属性、容忍 CRLF/LF 与行折叠；
 * 解析失败或无 SUMMARY/DTSTART 的 VEVENT 跳过，validateEvent 过滤不合法事件；
 * 任何输入都不抛异常。
 */
export function parseICal(text: string): EventDraft[] {
  const events: ParsedProperty[][] = []
  const stack: string[] = []
  for (const line of unfoldLines(text)) {
    const begin = /^BEGIN:([A-Za-z0-9-]+)/i.exec(line)
    const end = /^END:([A-Za-z0-9-]+)/i.exec(line)
    if (begin) {
      const name = begin[1].toUpperCase()
      stack.push(name)
      if (name === 'VEVENT') events.push([])
      continue
    }
    if (end) {
      stack.pop()
      continue
    }
    if (stack[stack.length - 1] === 'VEVENT') {
      const prop = parseProperty(line)
      if (prop) events[events.length - 1].push(prop)
    }
  }

  const drafts: EventDraft[] = []
  for (const props of events) {
    const draft = parseVEvent(props)
    if (draft && validateEvent(draft).length === 0) drafts.push(draft)
  }
  return drafts
}
