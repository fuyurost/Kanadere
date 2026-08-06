import { FestivalCategory } from '../types'
import type { YearHolidayData } from '../types'

/**
 * 2026 年中国法定节假日安排（依据国办发明电〔2025〕7号）
 *
 * 元旦：1月1日–3日，补班 1/4(周日)
 * 春节：2月15日(腊月廿八)–23日(正月初七)，补班 2/14(周六) 2/28(周六)
 * 清明节：4月4日–6日
 * 劳动节：5月1日–5日，补班 5/9(周六)
 * 端午节：6月19日–21日
 * 中秋节：9月25日–27日
 * 国庆节：10月1日–7日，补班 9/20(周日) 10/10(周六)
 *
 * 传统/西方节日为单日条目（农历日期依据香港天文台
 * 《公历与农历日期对照表》T2026e.txt，https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2026c.txt）。
 */
export const data2026: YearHolidayData = {
  year: 2026,
  holidays: [
    // ── 法定 ──
    { name: '元旦', range: ['2026-01-01', '2026-01-03'], category: FestivalCategory.Statutory },
    { name: '春节', range: ['2026-02-15', '2026-02-23'], category: FestivalCategory.Statutory },
    { name: '清明节', range: ['2026-04-04', '2026-04-06'], category: FestivalCategory.Statutory },
    { name: '劳动节', range: ['2026-05-01', '2026-05-05'], category: FestivalCategory.Statutory },
    { name: '端午节', range: ['2026-06-19', '2026-06-21'], category: FestivalCategory.Statutory },
    { name: '中秋节', range: ['2026-09-25', '2026-09-27'], category: FestivalCategory.Statutory },
    { name: '国庆节', range: ['2026-10-01', '2026-10-07'], category: FestivalCategory.Statutory },
    // ── 传统（农历，单日）──
    { name: '腊八节', range: ['2026-01-26', '2026-01-26'], category: FestivalCategory.Traditional },
    { name: '小年', range: ['2026-02-10', '2026-02-10'], category: FestivalCategory.Traditional },
    { name: '元宵节', range: ['2026-03-03', '2026-03-03'], category: FestivalCategory.Traditional },
    { name: '龙抬头', range: ['2026-03-20', '2026-03-20'], category: FestivalCategory.Traditional },
    { name: '七夕', range: ['2026-08-19', '2026-08-19'], category: FestivalCategory.Traditional },
    { name: '中元节', range: ['2026-08-27', '2026-08-27'], category: FestivalCategory.Traditional },
    { name: '重阳节', range: ['2026-10-18', '2026-10-18'], category: FestivalCategory.Traditional },
    // ── 西方（浮动日期按规则：母亲节 5月第2个周日、父亲节 6月第3个周日、感恩节 11月第4个周四）──
    { name: '情人节', range: ['2026-02-14', '2026-02-14'], category: FestivalCategory.Western },
    { name: '妇女节', range: ['2026-03-08', '2026-03-08'], category: FestivalCategory.Western },
    { name: '愚人节', range: ['2026-04-01', '2026-04-01'], category: FestivalCategory.Western },
    { name: '母亲节', range: ['2026-05-10', '2026-05-10'], category: FestivalCategory.Western },
    { name: '父亲节', range: ['2026-06-21', '2026-06-21'], category: FestivalCategory.Western },
    { name: '万圣节', range: ['2026-10-31', '2026-10-31'], category: FestivalCategory.Western },
    { name: '感恩节', range: ['2026-11-26', '2026-11-26'], category: FestivalCategory.Western },
    { name: '平安夜', range: ['2026-12-24', '2026-12-24'], category: FestivalCategory.Western },
    { name: '圣诞节', range: ['2026-12-25', '2026-12-25'], category: FestivalCategory.Western },
  ],
  adjustedWorkdays: [
    '2026-01-04',
    '2026-02-14',
    '2026-02-28',
    '2026-05-09',
    '2026-09-20',
    '2026-10-10',
  ],
}
