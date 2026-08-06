import { describe, it, expect } from 'vitest'
import { generateMonthGrid, generateWeekGrid, generateDayCell } from './engine'
import { enabledFestivalCategories } from '../holiday/engine'
import { DayType, FestivalCategory } from '../holiday/types'
import { data2025 } from '../holiday/data/2025'

describe('generateMonthGrid', () => {
  it('返回固定 42 个单元格', () => {
    const grid = generateMonthGrid(2025, 1, data2025)
    expect(grid.cells).toHaveLength(42)
    expect(grid.year).toBe(2025)
    expect(grid.month).toBe(1)
  })

  it('第一格是首周周一', () => {
    // 2025-01-01 是周三，首周周一是 2024-12-30
    const grid = generateMonthGrid(2025, 1, data2025, 1)
    const first = grid.cells[0]!
    expect(first.date.getFullYear()).toBe(2024)
    expect(first.date.getMonth()).toBe(11) // 12月
    expect(first.date.getDate()).toBe(30)  // 周一 = 12/30
  })

  it('包含前月填充日期（isCurrentMonth=false）', () => {
    const grid = generateMonthGrid(2025, 1, data2025, 1)
    const preMonthCells = grid.cells.filter(c => !c.isCurrentMonth && c.date < new Date(2025, 0, 1))
    expect(preMonthCells.length).toBeGreaterThan(0)
  })

  it('包含后月填充日期（isCurrentMonth=false）', () => {
    const grid = generateMonthGrid(2025, 1, data2025, 1)
    const postMonthCells = grid.cells.filter(c => !c.isCurrentMonth && c.date >= new Date(2025, 1, 1))
    expect(postMonthCells.length).toBeGreaterThan(0)
  })

  it('当月日期 isCurrentMonth=true', () => {
    const grid = generateMonthGrid(2025, 1, data2025, 1)
    const janCells = grid.cells.filter(
      c => c.date.getFullYear() === 2025 && c.date.getMonth() === 0,
    )
    expect(janCells.length).toBe(31)
    expect(janCells.every(c => c.isCurrentMonth)).toBe(true)
  })

  it('春节日期标记为 Holiday', () => {
    const grid = generateMonthGrid(2025, 1, data2025, 1)
    const jan28 = grid.cells.find(
      c => c.date.getFullYear() === 2025 && c.date.getMonth() === 0 && c.date.getDate() === 28,
    )
    expect(jan28!.dayType).toBe(DayType.Holiday)
    expect(jan28!.holidayName).toBe('春节')
  })

  it('调休日标记为 AdjustedWorkday', () => {
    const grid = generateMonthGrid(2025, 1, data2025, 1)
    const jan26 = grid.cells.find(
      c => c.date.getFullYear() === 2025 && c.date.getMonth() === 0 && c.date.getDate() === 26,
    )
    expect(jan26!.dayType).toBe(DayType.AdjustedWorkday)
  })

  it('普通周末标记为 Weekend', () => {
    const grid = generateMonthGrid(2025, 1, data2025, 1)
    const jan11 = grid.cells.find(
      c => c.date.getFullYear() === 2025 && c.date.getMonth() === 0 && c.date.getDate() === 11,
    )
    expect(jan11!.dayType).toBe(DayType.Weekend) // 1/11 周六
  })
})

describe('generateWeekGrid', () => {
  it('返回 7 天，首日为周起始日', () => {
    // 2025-01-15 是周三，weekStartsOn=1 → 1/13(周一)–1/19(周日)
    const grid = generateWeekGrid(new Date(2025, 0, 15), data2025, 1)
    expect(grid.days).toHaveLength(7)
    expect(grid.days[0]!.date.getDate()).toBe(13)
    expect(grid.days[6]!.date.getDate()).toBe(19)
  })

  it('weekStartsOn=0 时首日为周日', () => {
    // 2025-01-15 周三 → 1/12(周日)–1/18(周六)
    const grid = generateWeekGrid(new Date(2025, 0, 15), data2025, 0)
    expect(grid.days[0]!.date.getDate()).toBe(12)
    expect(grid.days[6]!.date.getDate()).toBe(18)
  })

  it('跨月周正确填充', () => {
    // 2025-01-01 周三 → 12/30(周一)–1/5(周日)
    const grid = generateWeekGrid(new Date(2025, 0, 1), data2025, 1)
    expect(grid.days[0]!.date.getMonth()).toBe(11) // 12月
    expect(grid.days[0]!.date.getDate()).toBe(30)
    expect(grid.days[6]!.date.getMonth()).toBe(0) // 1月
    expect(grid.days[6]!.date.getDate()).toBe(5)
  })

  it('春节在周内标记为 Holiday', () => {
    const grid = generateWeekGrid(new Date(2025, 0, 30), data2025, 1)
    const jan28 = grid.days.find(d => d.date.getDate() === 28)
    expect(jan28!.dayType).toBe(DayType.Holiday)
    expect(jan28!.holidayName).toBe('春节')
  })

  it('调休日标记为 AdjustedWorkday', () => {
    const grid = generateWeekGrid(new Date(2025, 0, 26), data2025, 1)
    const jan26 = grid.days.find(d => d.date.getDate() === 26)
    expect(jan26!.dayType).toBe(DayType.AdjustedWorkday)
  })
})

describe('generateDayCell', () => {
  it('国庆节标记为 Holiday', () => {
    const { cell } = generateDayCell(new Date(2025, 9, 1), data2025)
    expect(cell.dayType).toBe(DayType.Holiday)
    expect(cell.holidayName).toBe('中秋节·国庆节')
  })

  it('调休日标记为 AdjustedWorkday', () => {
    const { cell } = generateDayCell(new Date(2025, 0, 26), data2025)
    expect(cell.dayType).toBe(DayType.AdjustedWorkday)
  })

  it('普通工作日标记为 Workday', () => {
    const { cell } = generateDayCell(new Date(2025, 0, 15), data2025)
    expect(cell.dayType).toBe(DayType.Workday)
  })
})

describe('网格生成：enabled 过滤参数', () => {
  const noTraditional = enabledFestivalCategories({ statutory: true, traditional: false, western: true })
  const noStatutory = enabledFestivalCategories({ statutory: false, traditional: true, western: true })

  it('禁用传统后 元宵节不再是 Holiday 且无节日名（2025-02-12 周三 → Workday）', () => {
    const grid = generateMonthGrid(2025, 2, data2025, 1, noTraditional)
    const yuanxiao = grid.cells.find(
      c => c.date.getFullYear() === 2025 && c.date.getMonth() === 1 && c.date.getDate() === 12,
    )
    expect(yuanxiao!.dayType).toBe(DayType.Workday)
    expect(yuanxiao!.holidayName).toBeUndefined()
  })

  it('禁用法定后 春节回落且调休仍生效', () => {
    const grid = generateMonthGrid(2025, 1, data2025, 1, noStatutory)
    const jan28 = grid.cells.find(
      c => c.date.getFullYear() === 2025 && c.date.getMonth() === 0 && c.date.getDate() === 28,
    )
    expect(jan28!.dayType).toBe(DayType.Workday) // 2025-01-28 周二
    const jan26 = grid.cells.find(
      c => c.date.getFullYear() === 2025 && c.date.getMonth() === 0 && c.date.getDate() === 26,
    )
    expect(jan26!.dayType).toBe(DayType.AdjustedWorkday)
  })

  it('generateDayCell 透传过滤（禁用传统 → 七夕回落）', () => {
    const { cell } = generateDayCell(new Date(2025, 7, 29), data2025, noTraditional)
    expect(cell.dayType).toBe(DayType.Workday) // 2025-08-29 周五
    expect(cell.holidayName).toBeUndefined()
  })

  it('缺省参数仍全部显示（与旧行为一致）', () => {
    const grid = generateMonthGrid(2025, 2, data2025, 1)
    const yuanxiao = grid.cells.find(
      c => c.date.getFullYear() === 2025 && c.date.getMonth() === 1 && c.date.getDate() === 12,
    )
    expect(yuanxiao!.dayType).toBe(DayType.Holiday)
    expect(yuanxiao!.holidayName).toBe('元宵节')
  })
})

describe('网格生成：holidayCategory', () => {
  it('元宵节 → traditional（名称与类别同条目）', () => {
    const grid = generateMonthGrid(2025, 2, data2025, 1)
    const c = grid.cells.find(
      cell => cell.date.getFullYear() === 2025 && cell.date.getMonth() === 1 && cell.date.getDate() === 12,
    )
    expect(c!.dayType).toBe(DayType.Holiday)
    expect(c!.holidayName).toBe('元宵节')
    expect(c!.holidayCategory).toBe(FestivalCategory.Traditional)
  })

  it('春节 → statutory', () => {
    const grid = generateMonthGrid(2025, 1, data2025, 1)
    const c = grid.cells.find(
      cell => cell.date.getFullYear() === 2025 && cell.date.getMonth() === 0 && cell.date.getDate() === 28,
    )
    expect(c!.holidayCategory).toBe(FestivalCategory.Statutory)
    expect(c!.holidayName).toBe('春节')
  })

  it('圣诞节 → western（generateDayCell）', () => {
    const { cell } = generateDayCell(new Date(2025, 11, 25), data2025)
    expect(cell.holidayName).toBe('圣诞节')
    expect(cell.holidayCategory).toBe(FestivalCategory.Western)
  })

  it('禁用类别后 holidayCategory undefined（回落为 Workday）', () => {
    const noTraditional = enabledFestivalCategories({ statutory: true, traditional: false, western: true })
    const grid = generateMonthGrid(2025, 2, data2025, 1, noTraditional)
    const c = grid.cells.find(
      cell => cell.date.getFullYear() === 2025 && cell.date.getMonth() === 1 && cell.date.getDate() === 12,
    )
    expect(c!.dayType).toBe(DayType.Workday)
    expect(c!.holidayName).toBeUndefined()
    expect(c!.holidayCategory).toBeUndefined()
  })

  it('普通日无 holidayCategory', () => {
    const { cell } = generateDayCell(new Date(2025, 5, 10), data2025)
    expect(cell.holidayCategory).toBeUndefined()
    expect(cell.holidayName).toBeUndefined()
  })
})
