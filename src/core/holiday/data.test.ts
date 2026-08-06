import { describe, it, expect } from 'vitest'
import { getHolidayData, EMPTY_HOLIDAY_DATA } from './data'
import { data2025 } from './data/2025'
import { data2026 } from './data/2026'
import { data2027 } from './data/2027'
import { FestivalCategory } from './types'
import type { HolidayEntry, YearHolidayData } from './types'

const YEAR_DATASETS: Record<number, YearHolidayData> = {
  2025: data2025,
  2026: data2026,
  2027: data2027,
}

const TRADITIONAL_NAMES = ['元宵节', '龙抬头', '七夕', '中元节', '重阳节', '腊八节', '小年']
const WESTERN_NAMES = ['情人节', '妇女节', '愚人节', '母亲节', '父亲节', '万圣节', '感恩节', '平安夜', '圣诞节']

function parseKey(s: string): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

function toKey(d: Date): string {
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mo}-${day}`
}

/** 展开某条目的全部日期（按天） */
function expandEntry(h: HolidayEntry): string[] {
  const start = parseKey(h.range[0])
  const end = parseKey(h.range[1])
  const days: string[] = []
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    days.push(toKey(new Date(t)))
  }
  return days
}

describe('节假日数据注册', () => {
  it('2025/2026/2027 均已注册（非 EMPTY）', () => {
    for (const year of [2025, 2026, 2027]) {
      const data = getHolidayData(year)
      expect(data).not.toBe(EMPTY_HOLIDAY_DATA)
      expect(data.year).toBe(year)
      expect(data.holidays.length).toBeGreaterThan(0)
    }
  })

  it('未注册年份返回 EMPTY_HOLIDAY_DATA', () => {
    expect(getHolidayData(2030)).toBe(EMPTY_HOLIDAY_DATA)
  })
})

describe('节假日数据健全性', () => {
  it('每个条目的 category 合法', () => {
    const valid = new Set<FestivalCategory>([
      FestivalCategory.Statutory,
      FestivalCategory.Traditional,
      FestivalCategory.Western,
    ])
    for (const data of Object.values(YEAR_DATASETS)) {
      for (const h of data.holidays) {
        expect(valid.has(h.category)).toBe(true)
      }
    }
  })

  it('同类别条目无重复日期（按天）', () => {
    for (const data of Object.values(YEAR_DATASETS)) {
      for (const category of [FestivalCategory.Statutory, FestivalCategory.Traditional, FestivalCategory.Western]) {
        const days = data.holidays
          .filter((h) => h.category === category)
          .flatMap(expandEntry)
        expect(new Set(days).size).toBe(days.length)
      }
    }
  })

  it('传统/西方条目均为单日（range 起止相同）', () => {
    for (const data of Object.values(YEAR_DATASETS)) {
      for (const h of data.holidays) {
        if (h.category !== FestivalCategory.Statutory) {
          expect(h.range[0]).toBe(h.range[1])
        }
      }
    }
  })

  it('2025/2026 法定条目齐全，2027 无法定条目', () => {
    const statutory2025 = data2025.holidays
      .filter((h) => h.category === FestivalCategory.Statutory)
      .map((h) => h.name)
    expect(statutory2025.sort()).toEqual(['劳动节', '元旦', '春节', '清明节', '端午节', '中秋节·国庆节'].sort())

    const statutory2026 = data2026.holidays
      .filter((h) => h.category === FestivalCategory.Statutory)
      .map((h) => h.name)
    expect(statutory2026.sort()).toEqual(['劳动节', '国庆节', '元旦', '春节', '清明节', '端午节', '中秋节'].sort())

    expect(data2027.holidays.filter((h) => h.category === FestivalCategory.Statutory)).toHaveLength(0)
  })

  it('传统/西方条目名称齐全（7 传统 + 9 西方）', () => {
    for (const data of Object.values(YEAR_DATASETS)) {
      const traditional = data.holidays
        .filter((h) => h.category === FestivalCategory.Traditional)
        .map((h) => h.name)
      const western = data.holidays
        .filter((h) => h.category === FestivalCategory.Western)
        .map((h) => h.name)
      expect(traditional.sort()).toEqual([...TRADITIONAL_NAMES].sort())
      expect(western.sort()).toEqual([...WESTERN_NAMES].sort())
    }
  })

  it('跨类别同日条目是有意的（2026-06-21 端午节 + 父亲节）', () => {
    const june21 = data2026.holidays.filter((h) => expandEntry(h).includes('2026-06-21'))
    expect(june21.map((h) => h.name).sort()).toEqual(['端午节', '父亲节'].sort())
  })
})
