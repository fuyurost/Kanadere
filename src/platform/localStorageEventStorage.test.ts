import { describe, it, expect } from 'vitest'
import type { CalendarEvent } from '../core/events/types'
import { LocalStorageEventStorage } from './localStorageEventStorage'

function makeEvent(id: string): CalendarEvent {
  return {
    id,
    title: `事件 ${id}`,
    date: '2026-08-05',
    allDay: true,
  }
}

function mockStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: () => {},
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size
    },
  } as Storage
}

describe('LocalStorageEventStorage', () => {
  it('save 后 load 返回相同事件', async () => {
    const storage = mockStorage()
    const es = new LocalStorageEventStorage(storage)
    const events = [makeEvent('a'), makeEvent('b')]
    await es.save(events)
    expect(await es.load()).toEqual(events)
  })

  it('无数据时返回空数组', async () => {
    const es = new LocalStorageEventStorage(mockStorage())
    expect(await es.load()).toEqual([])
  })

  it('损坏的 JSON 静默降级为空数组', async () => {
    const storage = mockStorage({ 'kanadere.events.v1': '{oops' })
    const es = new LocalStorageEventStorage(storage)
    expect(await es.load()).toEqual([])
  })

  it('非数组 JSON 视为损坏返回空数组', async () => {
    const storage = mockStorage({ 'kanadere.events.v1': '{"a":1}' })
    const es = new LocalStorageEventStorage(storage)
    expect(await es.load()).toEqual([])
  })

  it('读取旧版存储键的既有数据', async () => {
    const legacy = JSON.stringify([makeEvent('legacy')])
    const es = new LocalStorageEventStorage(mockStorage({ 'kanadere.events.v1': legacy }))
    const loaded = await es.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]!.id).toBe('legacy')
  })

  it('platform 标识为 web-localStorage', () => {
    const es = new LocalStorageEventStorage(mockStorage())
    expect(es.platform).toBe('web-localStorage')
  })
})
