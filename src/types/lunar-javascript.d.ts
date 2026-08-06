/**
 * lunar-javascript 类型声明（npm 包未携带 .d.ts，仅声明本项目用到的 API）。
 * 版本锁定 1.7.7（npm latest）。注意：此版本 JieQi 表挂在 Lunar 上，
 * 不存在 `LunarYear.fromYear(y).getJieQiTable()`（见 src/core/lunar/lunar.ts）。
 */
declare module 'lunar-javascript' {
  /** 公历 */
  export class Solar {
    static fromDate(date: Date): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getHour(): number
    getMinute(): number
    getLunar(): Lunar
  }

  /** 农历 */
  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    /** 农历月序 1–12；闰月为负值（如 -6 = 闰六月） */
    getMonth(): number
    getDay(): number
    /** 月名基础字：正/二/…/十/冬/腊，闰月带"闰"前缀（如"闰六"） */
    getMonthInChinese(): string
    /** 日名：初一/初二/…/廿三/三十 */
    getDayInChinese(): string
    /**
     * 年份级 24 节气表：key → Solar（key 为简体中文节气名，含少数拼音别名键）。
     * 表覆盖范围：上一年冬至 ～ 当年大雪（故 12 月下旬的冬至在下一年的表里）。
     */
    getJieQiTable(): Record<string, Solar>
  }
}
