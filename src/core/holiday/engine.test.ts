import { describe, it, expect } from 'vitest'
import { resolveDayType, getHolidayName, getHolidayCategory, getHolidayEntry, enabledFestivalCategories } from './engine'
import { DayType, FestivalCategory } from './types'
import { data2025 } from './data/2025'
import { data2026 } from './data/2026'

describe('enabledFestivalCategories', () => {
  it('只挑出值为 true 的类别', () => {
    expect(enabledFestivalCategories({ statutory: true, traditional: false, western: true })).toEqual(
      new Set(['statutory', 'western']),
    )
    expect(enabledFestivalCategories({ statutory: false, traditional: false, western: false }).size).toBe(0)
  })
})

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
    expect(resolveDayType(new Date(2025, 2, 15), data2025)).toBe(DayType.Weekend) // 3/15 周六（无节日）
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
    expect(getHolidayName(new Date(2025, 2, 15), data2025)).toBeUndefined() // 普通周末
  })
})

describe('节日开关（enabled 过滤）', () => {
  const noStatutory = enabledFestivalCategories({ statutory: false, traditional: true, western: true })
  const noTraditional = enabledFestivalCategories({ statutory: true, traditional: false, western: true })
  const noneEnabled = enabledFestivalCategories({ statutory: false, traditional: false, western: false })

  it('缺省参数行为与旧一致（全部启用）', () => {
    expect(resolveDayType(new Date(2025, 0, 28), data2025)).toBe(DayType.Holiday) // 春节
    expect(resolveDayType(new Date(2025, 1, 12), data2025)).toBe(DayType.Holiday) // 元宵节
    expect(resolveDayType(new Date(2025, 1, 14), data2025)).toBe(DayType.Holiday) // 情人节
    expect(getHolidayName(new Date(2025, 0, 28), data2025)).toBe('春节')
  })

  it('禁用法定后 春节回落为 Workday（2025-01-28 周二）', () => {
    expect(resolveDayType(new Date(2025, 0, 28), data2025, noStatutory)).toBe(DayType.Workday)
    expect(resolveDayType(new Date(2025, 0, 29), data2025, noStatutory)).toBe(DayType.Workday)
  })

  it('禁用传统后 元宵节回落（2025-02-12 周三 → Workday）', () => {
    expect(resolveDayType(new Date(2025, 1, 12), data2025, noTraditional)).toBe(DayType.Workday)
  })

  it('禁用传统后 西方节日不受影响', () => {
    expect(resolveDayType(new Date(2025, 1, 14), data2025, noTraditional)).toBe(DayType.Holiday)
    expect(getHolidayName(new Date(2025, 1, 14), data2025, noTraditional)).toBe('情人节')
  })

  it('调休补班不受任何开关影响（仍 AdjustedWorkday）', () => {
    expect(resolveDayType(new Date(2025, 0, 26), data2025, noneEnabled)).toBe(DayType.AdjustedWorkday)
    expect(resolveDayType(new Date(2025, 1, 8), data2025, noStatutory)).toBe(DayType.AdjustedWorkday)
  })

  it('全部禁用后 周末仍为 Weekend', () => {
    expect(resolveDayType(new Date(2025, 2, 1), data2025, noneEnabled)).toBe(DayType.Weekend) // 3/1 周六
  })

  it('getHolidayName 在禁用类别时返回 undefined', () => {
    expect(getHolidayName(new Date(2025, 0, 28), data2025, noStatutory)).toBeUndefined()
    expect(getHolidayName(new Date(2025, 1, 12), data2025, noTraditional)).toBeUndefined()
  })
})

describe('getHolidayCategory / getHolidayEntry', () => {
  it('返回各类别', () => {
    expect(getHolidayCategory(new Date(2025, 0, 28), data2025)).toBe(FestivalCategory.Statutory)
    expect(getHolidayCategory(new Date(2025, 1, 12), data2025)).toBe(FestivalCategory.Traditional)
    expect(getHolidayCategory(new Date(2025, 11, 25), data2025)).toBe(FestivalCategory.Western)
  })

  it('非节假日返回 undefined', () => {
    expect(getHolidayCategory(new Date(2025, 2, 15), data2025)).toBeUndefined()
    expect(getHolidayCategory(new Date(2025, 0, 26), data2025)).toBeUndefined() // 调休日
    expect(getHolidayEntry(new Date(2025, 2, 15), data2025)).toBeUndefined()
  })

  it('禁用类别返回 undefined', () => {
    const noTraditional = enabledFestivalCategories({ statutory: true, traditional: false, western: true })
    expect(getHolidayCategory(new Date(2025, 1, 12), data2025, noTraditional)).toBeUndefined()
  })

  it('名称与类别来自同一条目（2026-06-21 端午+父亲节）', () => {
    // 全启用：法定端午节在前
    expect(getHolidayName(new Date(2026, 5, 21), data2026)).toBe('端午节')
    expect(getHolidayCategory(new Date(2026, 5, 21), data2026)).toBe(FestivalCategory.Statutory)
    // 关法定后：同一日期回落为西方父亲节
    const noStatutory = enabledFestivalCategories({ statutory: false, traditional: true, western: true })
    expect(getHolidayName(new Date(2026, 5, 21), data2026, noStatutory)).toBe('父亲节')
    expect(getHolidayCategory(new Date(2026, 5, 21), data2026, noStatutory)).toBe(FestivalCategory.Western)
    expect(getHolidayEntry(new Date(2026, 5, 21), data2026, noStatutory)?.name).toBe('父亲节')
  })
})
