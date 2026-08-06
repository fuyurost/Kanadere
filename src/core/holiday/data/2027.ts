import { FestivalCategory } from '../types'
import type { YearHolidayData } from '../types'

/**
 * 2027 年传统/西方节日（单日条目）。
 *
 * 2027 年法定节假日安排尚未公布（截至 2026-08），故不包含法定条目；
 * 农历日期依据香港天文台《公历与农历日期对照表》T2027e.txt，
 * https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2027c.txt。
 */
export const data2027: YearHolidayData = {
  year: 2027,
  holidays: [
    // ── 传统（农历，单日）──
    { name: '腊八节', range: ['2027-01-15', '2027-01-15'], category: FestivalCategory.Traditional },
    { name: '小年', range: ['2027-01-30', '2027-01-30'], category: FestivalCategory.Traditional },
    { name: '元宵节', range: ['2027-02-20', '2027-02-20'], category: FestivalCategory.Traditional },
    { name: '龙抬头', range: ['2027-03-09', '2027-03-09'], category: FestivalCategory.Traditional },
    { name: '七夕', range: ['2027-08-08', '2027-08-08'], category: FestivalCategory.Traditional },
    { name: '中元节', range: ['2027-08-16', '2027-08-16'], category: FestivalCategory.Traditional },
    { name: '重阳节', range: ['2027-10-08', '2027-10-08'], category: FestivalCategory.Traditional },
    // ── 西方（浮动日期按规则：母亲节 5月第2个周日、父亲节 6月第3个周日、感恩节 11月第4个周四）──
    { name: '情人节', range: ['2027-02-14', '2027-02-14'], category: FestivalCategory.Western },
    { name: '妇女节', range: ['2027-03-08', '2027-03-08'], category: FestivalCategory.Western },
    { name: '愚人节', range: ['2027-04-01', '2027-04-01'], category: FestivalCategory.Western },
    { name: '母亲节', range: ['2027-05-09', '2027-05-09'], category: FestivalCategory.Western },
    { name: '父亲节', range: ['2027-06-20', '2027-06-20'], category: FestivalCategory.Western },
    { name: '万圣节', range: ['2027-10-31', '2027-10-31'], category: FestivalCategory.Western },
    { name: '感恩节', range: ['2027-11-25', '2027-11-25'], category: FestivalCategory.Western },
    { name: '平安夜', range: ['2027-12-24', '2027-12-24'], category: FestivalCategory.Western },
    { name: '圣诞节', range: ['2027-12-25', '2027-12-25'], category: FestivalCategory.Western },
  ],
  adjustedWorkdays: [],
}
