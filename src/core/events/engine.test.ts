import { describe, it, expect } from 'vitest'
import {
  dateToKey,
  keyToDate,
  expandOccurrences,
  getEventsInRange,
  getEventsForDate,
  getUpcomingEvents,
  validateEvent,
  layoutTimeBlocks,
} from './engine'
import type { CalendarEvent, EventOccurrence } from './types'
import { RecurrenceFrequency } from './types'

function ev(partial: Partial<CalendarEvent> & Pick<CalendarEvent, 'date' | 'title'>): CalendarEvent {
  return { id: 'e1', allDay: true, ...partial }
}

describe('dateToKey / keyToDate', () => {
  it('往返一致（本地时区）', () => {
    const d = new Date(2025, 0, 15)
    expect(dateToKey(d)).toBe('2025-01-15')
    const back = keyToDate('2025-01-15')
    expect(back.getFullYear()).toBe(2025)
    expect(back.getMonth()).toBe(0)
    expect(back.getDate()).toBe(15)
    expect(dateToKey(back)).toBe('2025-01-15')
  })
})

describe('expandOccurrences — 无重复', () => {
  it('范围内返回单次', () => {
    const e = ev({ title: '单次', date: '2025-01-10' })
    expect(expandOccurrences(e, '2025-01-01', '2025-01-31')).toEqual([
      { event: e, date: '2025-01-10' },
    ])
  })

  it('范围外返回空', () => {
    const e = ev({ title: '单次', date: '2025-01-10' })
    expect(expandOccurrences(e, '2025-02-01', '2025-02-28')).toEqual([])
  })
})

describe('expandOccurrences — daily', () => {
  it('interval=1 连续多日', () => {
    const daily = ev({
      title: '每日',
      date: '2025-01-01',
      recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1 },
    })
    const occs = expandOccurrences(daily, '2025-01-01', '2025-01-05')
    expect(occs.map((o) => o.date)).toEqual([
      '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05',
    ])
  })

  it('interval=3 隔天跳日', () => {
    const every3 = ev({
      title: '隔三天',
      date: '2025-01-01',
      recurrence: { frequency: RecurrenceFrequency.Daily, interval: 3 },
    })
    const occs = expandOccurrences(every3, '2025-01-01', '2025-01-10')
    expect(occs.map((o) => o.date)).toEqual(['2025-01-01', '2025-01-04', '2025-01-07', '2025-01-10'])
  })
})

describe('expandOccurrences — weekly', () => {
  it('保持星期几（2025-01-06 起每周一）', () => {
    const weekly = ev({
      title: '每周',
      date: '2025-01-06',
      recurrence: { frequency: RecurrenceFrequency.Weekly, interval: 1 },
    })
    const occs = expandOccurrences(weekly, '2025-01-01', '2025-01-31')
    expect(occs.map((o) => o.date)).toEqual([
      '2025-01-06', '2025-01-13', '2025-01-20', '2025-01-27',
    ])
    for (const o of occs) expect(keyToDate(o.date).getDay()).toBe(1)
  })
})

describe('expandOccurrences — until 边界', () => {
  it('until 当天有发生、次日无', () => {
    const daily = ev({
      title: '有期限',
      date: '2025-01-01',
      recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1, until: '2025-01-03' },
    })
    const occs = expandOccurrences(daily, '2025-01-01', '2025-01-10')
    expect(occs.map((o) => o.date)).toEqual(['2025-01-01', '2025-01-02', '2025-01-03'])
  })
})

describe('expandOccurrences — monthly', () => {
  it('31 号跳过 2/4/6/9/11 等短月', () => {
    const monthly31 = ev({
      title: '月末',
      date: '2025-01-31',
      recurrence: { frequency: RecurrenceFrequency.Monthly, interval: 1 },
    })
    const occs = expandOccurrences(monthly31, '2025-01-01', '2025-12-31')
    expect(occs.map((o) => o.date)).toEqual([
      '2025-01-31', '2025-03-31', '2025-05-31', '2025-07-31', '2025-08-31', '2025-10-31', '2025-12-31',
    ])
  })

  it('29 号跳过非闰年 2 月（2025）', () => {
    const monthly29 = ev({
      title: '29号',
      date: '2025-01-29',
      recurrence: { frequency: RecurrenceFrequency.Monthly, interval: 1 },
    })
    const occs = expandOccurrences(monthly29, '2025-01-01', '2025-06-30')
    expect(occs.map((o) => o.date)).toEqual([
      '2025-01-29', '2025-03-29', '2025-04-29', '2025-05-29', '2025-06-29',
    ])
  })
})

describe('expandOccurrences — yearly', () => {
  it('2 月 29 日只在闰年出现', () => {
    const leap = ev({
      title: '闰日',
      date: '2024-02-29',
      recurrence: { frequency: RecurrenceFrequency.Yearly, interval: 1 },
    })
    const occs = expandOccurrences(leap, '2024-01-01', '2030-12-31')
    expect(occs.map((o) => o.date)).toEqual(['2024-02-29', '2028-02-29'])
  })

  it('平年同月同日（3 月 1 日）', () => {
    const normal = ev({
      title: '周年',
      date: '2025-03-01',
      recurrence: { frequency: RecurrenceFrequency.Yearly, interval: 1 },
    })
    const occs = expandOccurrences(normal, '2025-01-01', '2027-12-31')
    expect(occs.map((o) => o.date)).toEqual(['2025-03-01', '2026-03-01', '2027-03-01'])
  })
})

describe('expandOccurrences — 范围边界', () => {
  it('start 等于首个 occurrence、end 等于最后一个', () => {
    const daily = ev({
      title: '边界',
      date: '2025-01-10',
      recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1 },
    })
    const occs = expandOccurrences(daily, '2025-01-10', '2025-01-15')
    expect(occs.map((o) => o.date)).toEqual([
      '2025-01-10', '2025-01-11', '2025-01-12', '2025-01-13', '2025-01-14', '2025-01-15',
    ])
  })

  it('无重复事件落在 rangeEnd 当天仍返回', () => {
    const single = ev({ title: '末日', date: '2025-03-31' })
    expect(expandOccurrences(single, '2025-03-01', '2025-03-31')).toHaveLength(1)
  })
})

describe('getEventsInRange / getEventsForDate', () => {
  const e1 = ev({ id: 'e1', title: '全天A', date: '2025-01-15', allDay: true })
  const e2 = ev({ id: 'e2', title: '下午', date: '2025-01-15', allDay: false, startTime: '14:00', endTime: '15:00' })
  const e3 = ev({ id: 'e3', title: '上午', date: '2025-01-15', allDay: false, startTime: '09:00', endTime: '10:00' })
  const e4 = ev({ id: 'e4', title: '全天B（无时间）', date: '2025-01-15', allDay: false })
  const e5 = ev({ id: 'e5', title: '前一天', date: '2025-01-14', allDay: false, startTime: '08:00', endTime: '09:00' })

  it('多事件排序：日期升序、同日全天在前、再按开始时间', () => {
    const occs = getEventsInRange([e1, e2, e3, e4, e5], '2025-01-01', '2025-01-31')
    expect(occs.map((o) => o.event.id)).toEqual(['e5', 'e1', 'e4', 'e3', 'e2'])
  })

  it('getEventsForDate 只返回当日发生', () => {
    const daily = ev({
      title: '每日',
      date: '2025-01-01',
      recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1 },
    })
    expect(getEventsForDate([e1, daily], '2025-01-10')).toHaveLength(1)
    expect(getEventsForDate([e1, daily], '2025-01-15')).toHaveLength(2)
  })
})

describe('getUpcomingEvents', () => {
  const daily = ev({
    title: '每日',
    date: '2025-01-01',
    recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1 },
  })
  const later = ev({ id: 'later', title: '远日', date: '2025-03-20' })

  it('数量限制：horizon 内取前 limit 条', () => {
    const up = getUpcomingEvents([daily, later], '2025-01-10', 5, 30)
    expect(up.map((o) => o.date)).toEqual([
      '2025-01-10', '2025-01-11', '2025-01-12', '2025-01-13', '2025-01-14',
    ])
  })

  it('horizon 外的发生不进入结果', () => {
    const up30 = getUpcomingEvents([daily, later], '2025-01-10', 100, 30)
    expect(up30.some((o) => o.event.id === later.id)).toBe(false)
  })

  it('horizon 扩大后纳入远处事件', () => {
    const up80 = getUpcomingEvents([daily, later], '2025-01-10', 100, 80)
    expect(up80.some((o) => o.event.id === later.id)).toBe(true)
    expect(up80.map((o) => o.date).slice(0, 5)).toEqual([
      '2025-01-10', '2025-01-11', '2025-01-12', '2025-01-13', '2025-01-14',
    ])
  })
})

describe('validateEvent', () => {
  it('合法 draft（时间段 / 全天 / 带重复）返回 []', () => {
    expect(validateEvent({ title: '会议', date: '2025-01-10', allDay: false, startTime: '09:00', endTime: '10:00' })).toEqual([])
    expect(validateEvent({ title: '全天', date: '2025-01-10', allDay: true })).toEqual([])
    expect(validateEvent({
      title: '每日',
      date: '2025-01-10',
      allDay: true,
      recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1, until: '2025-02-01' },
    })).toEqual([])
  })

  it('日期无效（格式错误 / 不存在的日期）', () => {
    expect(validateEvent({ title: 'x', date: '2025-1-10', allDay: true })).toEqual(['日期无效'])
    expect(validateEvent({ title: 'x', date: '2025-02-30', allDay: true })).toEqual(['日期无效'])
  })

  it('标题不能为空', () => {
    expect(validateEvent({ title: '   ', date: '2025-01-10', allDay: true })).toEqual(['标题不能为空'])
  })

  it('非全天缺开始/结束时间', () => {
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: false })).toEqual(['请填写开始时间'])
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: false, startTime: '09:00' })).toEqual(['请填写结束时间'])
  })

  it('时间格式无效', () => {
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: false, startTime: '9:00', endTime: '10:00' })).toEqual(['时间格式无效'])
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: false, startTime: '09:00', endTime: '25:00' })).toEqual(['时间格式无效'])
  })

  it('结束时间需晚于开始时间', () => {
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: false, startTime: '10:00', endTime: '10:00' })).toEqual(['结束时间需晚于开始时间'])
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: false, startTime: '11:00', endTime: '10:00' })).toEqual(['结束时间需晚于开始时间'])
  })

  it('重复间隔至少为 1', () => {
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: true, recurrence: { frequency: RecurrenceFrequency.Daily, interval: 0 } })).toEqual(['重复间隔至少为 1'])
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: true, recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1.5 } })).toEqual(['重复间隔至少为 1'])
  })

  it('结束日期不能早于开始日期', () => {
    expect(validateEvent({ title: 'x', date: '2025-01-10', allDay: true, recurrence: { frequency: RecurrenceFrequency.Daily, interval: 1, until: '2025-01-09' } })).toEqual(['结束日期不能早于开始日期'])
  })
})

describe('layoutTimeBlocks', () => {
  const at = (title: string, start: string, end: string): EventOccurrence => ({
    event: ev({ title, date: '2025-01-10', allDay: false, startTime: start, endTime: end }),
    date: '2025-01-10',
  })

  it('单事件全宽：top/height 百分比正确', () => {
    const l = layoutTimeBlocks([at('A', '09:00', '10:00')])
    expect(l).toHaveLength(1)
    expect(l[0]!.laneIndex).toBe(0)
    expect(l[0]!.laneCount).toBe(1)
    expect(l[0]!.topPercent).toBeCloseTo(37.5)
    expect(l[0]!.heightPercent).toBeCloseTo((60 / 1440) * 100)
  })

  it('两事件重叠分 lane', () => {
    const l = layoutTimeBlocks([at('B', '09:00', '10:00'), at('C', '09:30', '10:30')])
    expect(l.map((b) => b.laneIndex)).toEqual([0, 1])
    expect(l.every((b) => b.laneCount === 2)).toBe(true)
  })

  it('不重叠事件共用 lane（首尾相接也算不重叠）', () => {
    const l = layoutTimeBlocks([at('D', '09:00', '10:00'), at('E', '10:00', '11:00')])
    expect(l.map((b) => b.laneIndex)).toEqual([0, 0])
    expect(l.every((b) => b.laneCount === 1)).toBe(true)
  })

  it('全天事件被过滤，短事件高度不低于 1.2%', () => {
    const allDay: EventOccurrence = {
      event: ev({ title: '全天', date: '2025-01-10', allDay: true }),
      date: '2025-01-10',
    }
    const tiny: EventOccurrence = {
      event: ev({ title: 'T', date: '2025-01-10', allDay: false, startTime: '09:00', endTime: '09:01' }),
      date: '2025-01-10',
    }
    const mix = layoutTimeBlocks([allDay, tiny])
    expect(mix).toHaveLength(1)
    expect(mix[0]!.heightPercent).toBe(1.2)
  })
})
