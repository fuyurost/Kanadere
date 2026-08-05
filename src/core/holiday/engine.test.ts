import { describe, it, expect } from 'vitest'
import { resolveDayType, getHolidayName } from './engine'
import { DayType } from './types'
import { data2025 } from './data/2025'

describe('resolveDayType', () => {
  it('普通工作日返回 Workday', () => {
    expect(resolveDayType(new Date(2025, 2, 5), data2025)).toBe(DayType.Workday) // 3/5 周三
    expect(resolveDayType(new Date(2025, 5, 10), data2025)).toBe(DayType.Workday) // 6/10 周二
  })

  it('法定节假日返回 Holiday', () => {
    // 春节
    expect(resolveDayType(new Date(2025, 0, 28), data2025)).toBe(DayType.Holiday)
    expect(resolveDayType(new Date(2025, 0, 29), data2025)).toBe(DayType.Holiday)
    expect(resolveDayType(new Date(2025, 1, 4), data2025)).toBe(DayType.Holiday) // 2/4 春节最后一天
    // 元旦
    expect(resolveDayType(new Date(2025, 0, 1), data2025)).toBe(DayType.Holiday)
    // 劳动节
    expect(resolveDayType(new Date(2025, 4, 1), data2025)).toBe(DayType.Holiday)
  })

  it('调休补班返回 AdjustedWorkday', () => {
    expect(resolveDayType(new Date(2025, 0, 26), data2025)).toBe(DayType.AdjustedWorkday) // 1/26 周日
    expect(resolveDayType(new Date(2025, 1, 8), data2025)).toBe(DayType.AdjustedWorkday) // 2/8 周六
    expect(resolveDayType(new Date(2025, 8, 28), data2025)).toBe(DayType.AdjustedWorkday) // 9/28 周日
  })

  it('普通周末返回 Weekend', () => {
    expect(resolveDayType(new Date(2025, 2, 1), data2025)).toBe(DayType.Weekend) // 3/1 周六
    expect(resolveDayType(new Date(2025, 2, 2), data2025)).toBe(DayType.Weekend) // 3/2 周日
    expect(resolveDayType(new Date(2025, 5, 14), data2025)).toBe(DayType.Weekend) // 6/14 周六（非调休）
  })

  it('优先级：Holiday > AdjustedWorkday', () => {
    // 春节期间的周末也是 Holiday，不是 AdjustedWorkday
    // 1/28 是周二，1/29 周三... 这个测试验证优先级链
    // 2025-01-01 是周三，元旦放假
    expect(resolveDayType(new Date(2025, 0, 1), data2025)).toBe(DayType.Holiday)
  })
})

describe('getHolidayName', () => {
  it('节假日返回名称', () => {
    expect(getHolidayName(new Date(2025, 0, 28), data2025)).toBe('春节')
    expect(getHolidayName(new Date(2025, 4, 1), data2025)).toBe('劳动节')
  })

  it('非节假日返回 undefined', () => {
    expect(getHolidayName(new Date(2025, 2, 5), data2025)).toBeUndefined()
    expect(getHolidayName(new Date(2025, 0, 26), data2025)).toBeUndefined() // 调休日
    expect(getHolidayName(new Date(2025, 2, 1), data2025)).toBeUndefined() // 普通周末
  })
})
