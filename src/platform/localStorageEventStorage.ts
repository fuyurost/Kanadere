import type { CalendarEvent } from '../core/events/types'
import {
  type EventStorage,
  LEGACY_LOCAL_STORAGE_KEY,
  parseLegacyEvents,
} from '../core/events/storage'

/**
 * Web 浏览器适配器：localStorage 持久化（同步 API 包装为异步接口）。
 * 存储键沿用旧版 `kanadere.events.v1`，Web 端数据无感延续。
 */
export class LocalStorageEventStorage implements EventStorage {
  readonly platform = 'web-localStorage'
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'>
  private readonly key: string

  constructor(
    storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage,
    key: string = LEGACY_LOCAL_STORAGE_KEY,
  ) {
    this.storage = storage
    this.key = key
  }

  async load(): Promise<CalendarEvent[]> {
    return parseLegacyEvents(this.storage.getItem(this.key)) ?? []
  }

  async save(events: CalendarEvent[]): Promise<void> {
    this.storage.setItem(this.key, JSON.stringify(events))
  }
}
