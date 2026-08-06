import { FestivalCategory } from '../types'
import type { YearHolidayData } from '../types'

/**
 * 2025 年中国法定节假日安排（依据国务院公告）
 *
 * 元旦：1月1日
 * 春节：1月28日(除夕)–2月4日，补班 1/26(周日) 2/8(周六)
 * 清明节：4月4日–4月6日
 * 劳动节：5月1日–5月5日，补班 4/27(周日)
 * 端午节：5月31日–6月2日
 * 中秋节+国庆节：10月1日–10月8日，补班 9/28(周日) 10/11(周六)
 *
 * 传统/西方节日为单日条目（农历日期依据香港天文台
 * 《公历与农历日期对照表》T2025e.txt，https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2025c.txt）。
 */
export const data2025: YearHolidayData = {
  year: 2025,
  holidays: [
    // ── 法定 ──
    { name: '元旦', range: ['2025-01-01', '2025-01-01'], category: FestivalCategory.Statutory },
    { name: '春节', range: ['2025-01-28', '2025-02-04'], category: FestivalCategory.Statutory },
    { name: '清明节', range: ['2025-04-04', '2025-04-06'], category: FestivalCategory.Statutory },
    { name: '劳动节', range: ['2025-05-01', '2025-05-05'], category: FestivalCategory.Statutory },
    { name: '端午节', range: ['2025-05-31', '2025-06-02'], category: FestivalCategory.Statutory },
    { name: '中秋节·国庆节', range: ['2025-10-01', '2025-10-08'], category: FestivalCategory.Statutory },
    // ── 传统（农历，单日）──
    { name: '腊八节', range: ['2025-01-07', '2025-01-07'], category: FestivalCategory.Traditional },
    { name: '小年', range: ['2025-01-22', '2025-01-22'], category: FestivalCategory.Traditional },
    { name: '元宵节', range: ['2025-02-12', '2025-02-12'], category: FestivalCategory.Traditional },
    { name: '龙抬头', range: ['2025-03-01', '2025-03-01'], category: FestivalCategory.Traditional },
    { name: '七夕', range: ['2025-08-29', '2025-08-29'], category: FestivalCategory.Traditional },
    { name: '中元节', range: ['2025-09-06', '2025-09-06'], category: FestivalCategory.Traditional },
    { name: '重阳节', range: ['2025-10-29', '2025-10-29'], category: FestivalCategory.Traditional },
    // ── 西方（浮动日期按规则：母亲节 5月第2个周日、父亲节 6月第3个周日、感恩节 11月第4个周四）──
    { name: '情人节', range: ['2025-02-14', '2025-02-14'], category: FestivalCategory.Western },
    { name: '妇女节', range: ['2025-03-08', '2025-03-08'], category: FestivalCategory.Western },
    { name: '愚人节', range: ['2025-04-01', '2025-04-01'], category: FestivalCategory.Western },
    { name: '母亲节', range: ['2025-05-11', '2025-05-11'], category: FestivalCategory.Western },
    { name: '父亲节', range: ['2025-06-15', '2025-06-15'], category: FestivalCategory.Western },
    { name: '万圣节', range: ['2025-10-31', '2025-10-31'], category: FestivalCategory.Western },
    { name: '感恩节', range: ['2025-11-27', '2025-11-27'], category: FestivalCategory.Western },
    { name: '平安夜', range: ['2025-12-24', '2025-12-24'], category: FestivalCategory.Western },
    { name: '圣诞节', range: ['2025-12-25', '2025-12-25'], category: FestivalCategory.Western },
  ],
  adjustedWorkdays: [
    '2025-01-26',
    '2025-02-08',
    '2025-04-27',
    '2025-09-28',
    '2025-10-11',
  ],
}
