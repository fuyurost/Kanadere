import type { CalendarEvent } from '../core/events/types'
import {
  type EventStorage,
  LEGACY_LOCAL_STORAGE_KEY,
  parseLegacyEvents,
} from '../core/events/storage'

/** plugin-store 文件路径（相对 appDataDir，即 %APPDATA%/com.fuyurost.kanadere/） */
const STORE_FILE = 'events.json'
const STORE_KEY = 'events'

/**
 * Tauri 桌面适配器：tauri-plugin-store 持久化到 appDataDir/events.json。
 *
 * 首次加载时若 store 为空且旧版 localStorage 有数据，自动迁移一次
 * （WebView2 内 localStorage 可读，桌面用户从 Web 版升级后数据不丢）。
 */
export class TauriStoreEventStorage implements EventStorage {
  readonly platform = 'tauri-plugin-store'

  async load(): Promise<CalendarEvent[]> {
    const { load } = await import('@tauri-apps/plugin-store')
    const store = await load(STORE_FILE, { autoSave: true })
    const stored = await store.get<CalendarEvent[]>(STORE_KEY)
    if (stored !== undefined && stored !== null) return stored

    // 一次性迁移旧版 localStorage 数据
    const legacy = parseLegacyEvents(localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY))
    if (legacy) {
      await store.set(STORE_KEY, legacy)
      return legacy
    }
    return []
  }

  async save(events: CalendarEvent[]): Promise<void> {
    const { load } = await import('@tauri-apps/plugin-store')
    const store = await load(STORE_FILE, { autoSave: true })
    await store.set(STORE_KEY, events)
  }
}
