/**
 * 农历与二十四节气（纯函数封装，零框架依赖；仅依赖 lunar-javascript 1.7.7，MIT）。
 *
 * 节气采用年份级 JieQi 表：`Lunar.fromYmd(y, 1, 1).getJieQiTable()` 返回 key→Solar 的
 * 24 节气映射（key 即简体中文名：惊蛰/谷雨/处暑/小满/芒种…），按日期组件匹配；
 * 不用 `Solar.getJieQi()` 这类依赖本地时区的 API——库内部按固定北京时间计算节气时刻，
 * 表内日期组件不随进程时区变化，CI（UTC）下稳定。
 *
 * 注意：本版本（1.7.7）不存在 `LunarYear.fromYear(y).getJieQiTable()`，
 * 等价的年份级表就是上面的 `Lunar.fromYmd(y, 1, 1).getJieQiTable()`，
 * 其覆盖范围为「上一年冬至 ～ 当年大雪」，因此 12 月下旬的冬至要查下一年的表。
 */
import { Lunar, Solar } from 'lunar-javascript'

function ymdKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 年份级节气表缓存：日期键 'YYYY-MM-DD' → 节气名（简体） */
const jieQiCache = new Map<number, ReadonlyMap<string, string>>()

function getYearJieQi(year: number): ReadonlyMap<string, string> {
  let table = jieQiCache.get(year)
  if (table === undefined) {
    const map = new Map<string, string>()
    for (const [name, solar] of Object.entries(Lunar.fromYmd(year, 1, 1).getJieQiTable())) {
      // 过滤拼音别名键（DA_XUE / DONG_ZHI 等），只保留简体中文节气名
      if (/[\u4e00-\u9fff]/.test(name)) {
        map.set(ymdKey(solar.getYear(), solar.getMonth(), solar.getDay()), name)
      }
    }
    table = map
    jieQiCache.set(year, table)
  }
  return table
}

/**
 * 农历日标签：初一显示月名（正月/二月/…/冬月/腊月，闰月带"闰"前缀如"闰六月"），
 * 其余显示日名（初X/十X/廿X/三十）。
 */
export function getLunarDayLabel(date: Date): string {
  const lunar = Solar.fromDate(date).getLunar()
  return lunar.getDay() === 1 ? `${lunar.getMonthInChinese()}月` : lunar.getDayInChinese()
}

/** 节气名（简体）；非节气日返回 undefined。 */
export function getSolarTermLabel(date: Date): string | undefined {
  const key = ymdKey(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return (
    getYearJieQi(date.getFullYear()).get(key) ??
    getYearJieQi(date.getFullYear() + 1).get(key)
  )
}

export interface LunarSubLabel {
  text: string
  /** true = 节气文本（高亮色），false = 农历日文本（弱化色） */
  isTerm: boolean
}

/** 组合子标签：节气优先于农历日。 */
export function getLunarSubLabel(date: Date): LunarSubLabel {
  const term = getSolarTermLabel(date)
  return term !== undefined
    ? { text: term, isTerm: true }
    : { text: getLunarDayLabel(date), isTerm: false }
}
