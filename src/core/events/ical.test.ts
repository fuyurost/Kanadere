import { describe, it, expect } from 'vitest'
import { generateICal, parseICal } from './ical'
import type { CalendarEvent } from './types'
import { RecurrenceFrequency } from './types'

function ev(partial: Partial<CalendarEvent> & Pick<CalendarEvent, 'date' | 'title'>): CalendarEvent {
  return { id: 'e1', allDay: true, ...partial }
}

describe('generateICal — 基础结构', () => {
  it('输出 VCALENDAR 2.0 骨架，CRLF 行尾', () => {
    const text = generateICal([])
    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('VERSION:2.0')
    expect(text).toContain('PRODID:-//Kanadere//CN 2.0//EN')
    expect(text).toContain('CALSCALE:GREGORIAN')
    expect(text).toContain('END:VCALENDAR')
    expect(text).toMatch(/\r\n/)
    expect(text.endsWith('\r\n')).toBe(true)
    expect(text.split('\r\n')).toHaveLength(6)
  })

  it('每个事件输出一个 VEVENT，含 UID/DTSTAMP/SUMMARY', () => {
    const text = generateICal([
      ev({ id: 'abc-123', title: '开会', date: '2026-08-05' }),
      ev({ id: 'def-456', title: '旅行', date: '2026-08-06' }),
    ])
    expect(text.split('BEGIN:VEVENT').length - 1).toBe(2)
    expect(text).toContain('UID:abc-123')
    expect(text).toContain('SUMMARY:开会')
    expect(text).toMatch(/DTSTAMP:\d{8}T\d{6}Z/)
  })
})

describe('generateICal — DTSTART/DTEND', () => {
  it('全天事件输出 VALUE=DATE，DTEND 为次日', () => {
    const text = generateICal([ev({ title: '全天', date: '2026-08-05' })])
    expect(text).toContain('DTSTART;VALUE=DATE:20260805')
    expect(text).toContain('DTEND;VALUE=DATE:20260806')
  })

  it('非全天事件输出浮动本地时间（无 TZID）', () => {
    const text = generateICal([
      ev({ title: '会议', date: '2026-08-05', allDay: false, startTime: '09:30', endTime: '10:30' }),
    ])
    expect(text).toContain('DTSTART:20260805T093000')
    expect(text).toContain('DTEND:20260805T103000')
  })
})

describe('generateICal — RRULE', () => {
  it('FREQ + INTERVAL 输出', () => {
    const text = generateICal([
      ev({
        title: '早读',
        date: '2026-08-05',
        recurrence: { frequency: RecurrenceFrequency.Daily, interval: 2 },
      }),
    ])
    expect(text).toContain('RRULE:FREQ=DAILY;INTERVAL=2')
  })

  it('UNTIL 全天按 DATE、非全天按浮动 DATE-TIME 输出', () => {
    const allDay = generateICal([
      ev({
        title: 'a',
        date: '2026-08-05',
        recurrence: { frequency: RecurrenceFrequency.Weekly, interval: 1, until: '2026-09-30' },
      }),
    ])
    expect(allDay).toContain('UNTIL=20260930')
    const timed = generateICal([
      ev({
        title: 'b',
        date: '2026-08-05',
        allDay: false,
        startTime: '09:00',
        endTime: '10:00',
        recurrence: { frequency: RecurrenceFrequency.Monthly, interval: 1, until: '2026-09-30' },
      }),
    ])
    expect(timed).toContain('UNTIL=20260930T235959')
  })
})

describe('generateICal — 行折叠', () => {
  it('长标题按 75 字符折行，续行以空格开头，所有物理行不超 75', () => {
    const text = generateICal([ev({ title: 'x'.repeat(200), date: '2026-08-05' })])
    for (const line of text.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75)
    }
    const continuation = text.split('\r\n').filter((l) => l.startsWith(' '))
    expect(continuation.length).toBeGreaterThan(0)
  })

  it('折叠后的文本可解析还原原标题', () => {
    const longTitle = `很长很长的标题${'x'.repeat(120)}`
    const parsed = parseICal(generateICal([ev({ title: longTitle, date: '2026-08-05' })]))
    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe(longTitle)
  })
})

describe('round-trip — generateICal → parseICal', () => {
  it('还原 title/date/allDay/startTime/endTime/recurrence', () => {
    const events: CalendarEvent[] = [
      ev({
        id: 'a',
        title: '全天标记',
        date: '2026-08-05',
        recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1 },
      }),
      ev({
        id: 'b',
        title: '定时会议',
        date: '2026-08-06',
        allDay: false,
        startTime: '14:30',
        endTime: '15:00',
        recurrence: { frequency: RecurrenceFrequency.Weekly, interval: 2, until: '2026-12-31' },
      }),
    ]
    const parsed = parseICal(generateICal(events))
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({
      title: '全天标记',
      date: '2026-08-05',
      allDay: true,
      recurrence: { frequency: 'daily', interval: 1 },
    })
    expect(parsed[1]).toEqual({
      title: '定时会议',
      date: '2026-08-06',
      allDay: false,
      startTime: '14:30',
      endTime: '15:00',
      recurrence: { frequency: 'weekly', interval: 2, until: '2026-12-31' },
    })
  })

  it('标题含逗号/分号/反斜杠可转义并还原', () => {
    const title = 'A, B; C\\D'
    const text = generateICal([ev({ title, date: '2026-08-05' })])
    expect(text).toContain('SUMMARY:A\\, B\\; C\\\\D')
    const parsed = parseICal(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe(title)
  })
})

describe('parseICal — 行折叠', () => {
  it('处理 LF 行尾与空格/制表符续行', () => {
    const title = `折行标题-${'z'.repeat(100)}`
    const text = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:fold-2',
      'DTSTART:20260805T093000',
      'DTEND:20260805T100000',
      `SUMMARY:${title.slice(0, 60)}`,
      `\t${title.slice(60, 90)}`,
      ` ${title.slice(90)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n')
    const parsed = parseICal(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe(title)
    expect(parsed[0].startTime).toBe('09:30')
    expect(parsed[0].endTime).toBe('10:00')
  })
})

describe('parseICal — 损坏输入', () => {
  it('垃圾文本不抛异常，返回空数组', () => {
    expect(() => parseICal('')).not.toThrow()
    expect(parseICal('')).toEqual([])
    expect(parseICal('hello world')).toEqual([])
    expect(parseICal('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR')).toEqual([])
  })

  it('部分损坏的 VEVENT 被跳过，保留可解析子集', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:bad-1',
      'DTSTART:not-a-date',
      'SUMMARY:坏事件',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:good-1',
      'DTSTART;VALUE=DATE:20260805',
      'SUMMARY:好事件',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const parsed = parseICal(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe('好事件')
    expect(parsed[0].date).toBe('2026-08-05')
  })
})

describe('parseICal — 必需字段', () => {
  it('无 SUMMARY 的 VEVENT 被跳过', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:no-summary',
      'DTSTART;VALUE=DATE:20260805',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    expect(parseICal(text)).toEqual([])
  })

  it('无 DTSTART 的 VEVENT 被跳过', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:no-dtstart',
      'SUMMARY:没开始时间',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    expect(parseICal(text)).toEqual([])
  })

  it('属性 key 大小写不敏感', () => {
    const text = [
      'begin:vcalendar',
      'version:2.0',
      'begin:vevent',
      'uid:case-1',
      'dtstart;value=date:20260805',
      'summary:小写键',
      'end:vevent',
      'end:vcalendar',
    ].join('\r\n')
    const parsed = parseICal(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe('小写键')
    expect(parsed[0].allDay).toBe(true)
  })
})

describe('parseICal — RRULE', () => {
  it('解析 FREQ/INTERVAL/UNTIL，UNTIL 取日期部分', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:rrule-1',
      'DTSTART;VALUE=DATE:20260805',
      'SUMMARY:重复',
      'RRULE:FREQ=WEEKLY;INTERVAL=3;UNTIL=20261231T235959Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const parsed = parseICal(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].recurrence).toEqual({
      frequency: 'weekly',
      interval: 3,
      until: '2026-12-31',
    })
  })

  it('无有效 FREQ 的 RRULE 被忽略，事件仍按单次导入', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:rrule-2',
      'DTSTART;VALUE=DATE:20260805',
      'SUMMARY:坏规则',
      'RRULE:BOGUS=1',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const parsed = parseICal(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].recurrence).toBeUndefined()
  })
})

describe('parseICal — 校验过滤（validateEvent）', () => {
  it('同日 DTEND 正常解析 endTime', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:ok-timed',
      'DTSTART:20260805T093000',
      'DTEND:20260805T103000',
      'SUMMARY:正常定时',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const parsed = parseICal(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].allDay).toBe(false)
    expect(parsed[0].startTime).toBe('09:30')
    expect(parsed[0].endTime).toBe('10:30')
  })

  it('非全天缺 DTEND 的事件被过滤', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:timed-no-end',
      'DTSTART:20260805T093000',
      'SUMMARY:缺结束时间',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    expect(parseICal(text)).toEqual([])
  })

  it('跨日 DTEND 的定时事件被过滤（引擎不支持跨夜）', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:cross-day',
      'DTSTART:20260805T230000',
      'DTEND:20260806T010000',
      'SUMMARY:跨夜',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    expect(parseICal(text)).toEqual([])
  })

  it('不存在的日期（2026-02-30）被过滤', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:bad-date',
      'DTSTART;VALUE=DATE:20260230',
      'SUMMARY:假日期',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    expect(parseICal(text)).toEqual([])
  })
})
