import type { CalendarEvent } from './types'

/**
 * 事件持久化抽象（core 层零平台依赖）。
 *
 * 平台适配器在 `src/platform/` 中实现：
 * - Web 浏览器 → localStorage
 * - Tauri 桌面 → tauri-plugin-store（appDataDir/events.json）
 * - 未来 Flutter/Kotlin/Swift 平台各自实现本接口
 *
 * 接口为异步：所有真实平台存储（文件、DB、系统 API）都是异步的。
 */
export interface EventStorage {
  /** 平台标识，用于诊断与日志 */
  readonly platform: string
  /** 读取全部事件；数据缺失或损坏时返回空数组（不抛错） */
  load(): Promise<CalendarEvent[]>
  /** 全量写入事件 */
  save(events: CalendarEvent[]): Promise<void>
}

/** 旧版 Web localStorage 存储键（桌面端首次启动用于一次性迁移） */
export const LEGACY_LOCAL_STORAGE_KEY = 'kanadere.events.v1'

/** 解析 localStorage 中的旧版事件数据；损坏或缺失返回 null */
export function parseLegacyEvents(raw: string | null): CalendarEvent[] | null {
  if (raw === null || raw === undefined) return null
  try {
    const parsed = JSON.parse(raw) as CalendarEvent[]
    if (!Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}
