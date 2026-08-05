import type { EventStorage } from '../core/events/storage'
import { LocalStorageEventStorage } from './localStorageEventStorage'

/**
 * 按运行环境解析事件存储适配器：
 * - Tauri 桌面（window.__TAURI_INTERNALS__ 由 WebView2 注入）→ plugin-store（events.json）
 * - 其他（浏览器）→ localStorage
 *
 * tauri 适配器用动态 import：纯 Web 构建不打包插件代码。
 */
export async function resolveEventStorage(): Promise<EventStorage> {
  const isTauri =
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in (window as unknown as Record<string, unknown>)
  if (isTauri) {
    const { TauriStoreEventStorage } = await import('./tauriStoreEventStorage')
    return new TauriStoreEventStorage()
  }
  return new LocalStorageEventStorage()
}
