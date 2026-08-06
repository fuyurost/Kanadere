import { describe, it, expect } from 'vitest'
import { getLunarDayLabel, getSolarTermLabel, getLunarSubLabel } from './lunar'

/** 本地时区构造（读取 getFullYear/getMonth/getDate 组件，与库内固定北京时间表匹配，UTC/任意时区稳定） */
function d(s: string): Date {
  const [y, m, day] = s.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, day)
}

describe('getLunarDayLabel（锚点对照香港天文台 T2025c/T2026c/T2027c.txt）', () => {
  it('初一显示月名（含闰月前缀）', () => {
    expect(getLunarDayLabel(d('2025-01-29'))).toBe('正月') // 正月初一
    expect(getLunarDayLabel(d('2025-07-25'))).toBe('闰六月') // 闰六月初一
    expect(getLunarDayLabel(d('2025-12-20'))).toBe('冬月') // 冬月初一
  })

  it('其余显示日名', () => {
    expect(getLunarDayLabel(d('2025-02-12'))).toBe('十五')
    expect(getLunarDayLabel(d('2025-08-29'))).toBe('初七')
    expect(getLunarDayLabel(d('2026-02-10'))).toBe('廿三')
    expect(getLunarDayLabel(d('2026-08-19'))).toBe('初七')
    expect(getLunarDayLabel(d('2027-03-09'))).toBe('初二')
    expect(getLunarDayLabel(d('2027-01-15'))).toBe('初八')
  })
})

describe('getSolarTermLabel（日期与香港天文台逐条核对）', () => {
  // 2025 全年 24 节气（T2025c.txt 逐日核对，程序化比对全一致）
  const TERMS_2025: Record<string, string> = {
    小寒: '2025-01-05', 大寒: '2025-01-20', 立春: '2025-02-03', 雨水: '2025-02-18',
    惊蛰: '2025-03-05', 春分: '2025-03-20', 清明: '2025-04-04', 谷雨: '2025-04-20',
    立夏: '2025-05-05', 小满: '2025-05-21', 芒种: '2025-06-05', 夏至: '2025-06-21',
    小暑: '2025-07-07', 大暑: '2025-07-22', 立秋: '2025-08-07', 处暑: '2025-08-23',
    白露: '2025-09-07', 秋分: '2025-09-23', 寒露: '2025-10-08', 霜降: '2025-10-23',
    立冬: '2025-11-07', 小雪: '2025-11-22', 大雪: '2025-12-07', 冬至: '2025-12-21',
  }
  // 2026/2027 抽样 10 个/年
  const TERMS_2026: Record<string, string> = {
    小寒: '2026-01-05', 立春: '2026-02-04', 惊蛰: '2026-03-05', 清明: '2026-04-05',
    夏至: '2026-06-21', 处暑: '2026-08-23', 白露: '2026-09-07', 寒露: '2026-10-08',
    霜降: '2026-10-23', 冬至: '2026-12-22',
  }
  const TERMS_2027: Record<string, string> = {
    小寒: '2027-01-05', 雨水: '2027-02-19', 惊蛰: '2027-03-06', 谷雨: '2027-04-20',
    芒种: '2027-06-06', 大暑: '2027-07-23', 立秋: '2027-08-08', 白露: '2027-09-08',
    霜降: '2027-10-23', 冬至: '2027-12-22',
  }

  it('2025 全年 24 节气逐条命中', () => {
    for (const [name, date] of Object.entries(TERMS_2025)) {
      expect(getSolarTermLabel(d(date))).toBe(name)
    }
  })

  it('2026 / 2027 各抽样 10 个节气命中', () => {
    for (const terms of [TERMS_2026, TERMS_2027]) {
      for (const [name, date] of Object.entries(terms)) {
        expect(getSolarTermLabel(d(date))).toBe(name)
      }
    }
  })

  it('12 月下旬的冬至查下一年的周期表（跨年边界）', () => {
    expect(getSolarTermLabel(d('2025-12-21'))).toBe('冬至') // 2025 表止于大雪 12/7
    expect(getSolarTermLabel(d('2025-12-07'))).toBe('大雪') // 当年表内
    expect(getSolarTermLabel(d('2027-12-22'))).toBe('冬至')
  })

  it('非节气日返回 undefined', () => {
    expect(getSolarTermLabel(d('2025-06-10'))).toBeUndefined()
    expect(getSolarTermLabel(d('2025-02-12'))).toBeUndefined() // 元宵节非节气
    expect(getSolarTermLabel(d('2025-12-25'))).toBeUndefined()
  })
})

describe('getLunarSubLabel（节气优先于农历日）', () => {
  it('节气日显示节气（isTerm=true）', () => {
    expect(getLunarSubLabel(d('2025-03-05'))).toEqual({ text: '惊蛰', isTerm: true })
    expect(getLunarSubLabel(d('2025-02-03'))).toEqual({ text: '立春', isTerm: true }) // 正月初六
  })

  it('非节气日显示农历（isTerm=false）', () => {
    expect(getLunarSubLabel(d('2025-01-29'))).toEqual({ text: '正月', isTerm: false })
    expect(getLunarSubLabel(d('2025-02-12'))).toEqual({ text: '十五', isTerm: false })
  })
})
