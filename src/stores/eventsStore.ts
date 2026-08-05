import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CalendarEvent, EventDraft, EventOccurrence } from '../core/events/types'
import {
  getEventsForDate as engineGetEventsForDate,
  getEventsInRange as engineGetEventsInRange,
  getUpcomingEvents as engineGetUpcomingEvents,
  validateEvent,
} from '../core/events/engine'
import type { EventStorage } from '../core/events/storage'
import { resolveEventStorage } from '../platform'

export type EventDialogState =
  | { mode: 'create'; date: string; time?: string }
  | { mode: 'edit'; id: string }
  | null

export const useEventsStore = defineStore('events', () => {
  const events = ref<CalendarEvent[]>([])
  const dialog = ref<EventDialogState>(null)

  let storage: EventStorage | null = null
  let readyPromise: Promise<void> | null = null

  /** 解析平台存储并加载事件；幂等，可被 main.ts 提前调用 */
  async function init(): Promise<void> {
    if (!readyPromise) {
      readyPromise = (async () => {
        storage = await resolveEventStorage()
        try {
          events.value = await storage.load()
        } catch {
          events.value = [] // 存储不可用时降级为内存态，不阻塞启动
        }
      })()
    }
    return readyPromise
  }

  async function persist() {
    await init()
    await storage!.save(events.value)
  }

  async function createEvent(draft: EventDraft): Promise<CalendarEvent> {
    await init()
    const errors = validateEvent(draft)
    if (errors.length > 0) throw new Error(errors[0])
    const event: CalendarEvent = { ...draft, id: crypto.randomUUID() }
    events.value.push(event)
    await persist()
    return event
  }

  async function updateEvent(id: string, draft: EventDraft): Promise<void> {
    await init()
    const event = events.value.find((e) => e.id === id)
    if (!event) throw new Error('事件不存在')
    const errors = validateEvent(draft)
    if (errors.length > 0) throw new Error(errors[0])
    Object.assign(event, draft)
    await persist()
  }

  async function deleteEvent(id: string): Promise<void> {
    await init()
    events.value = events.value.filter((e) => e.id !== id)
    await persist()
  }

  /** 清除全部事件（开发者调试/一键重置） */
  async function clearEvents(): Promise<void> {
    await init()
    events.value = []
    await persist()
  }

  function getEventsForDate(dateKey: string): EventOccurrence[] {
    return engineGetEventsForDate(events.value, dateKey)
  }

  function getEventsInRange(start: string, end: string): EventOccurrence[] {
    return engineGetEventsInRange(events.value, start, end)
  }

  function getUpcoming(fromKey: string, limit = 5, horizonDays = 60): EventOccurrence[] {
    return engineGetUpcomingEvents(events.value, fromKey, limit, horizonDays)
  }

  function openCreate(date: string, time?: string) {
    dialog.value = { mode: 'create', date, time }
  }

  function openEdit(id: string) {
    dialog.value = { mode: 'edit', id }
  }

  function closeDialog() {
    dialog.value = null
  }

  return {
    init,
    events,
    dialog,
    createEvent,
    updateEvent,
    deleteEvent,
    clearEvents,
    getEventsForDate,
    getEventsInRange,
    getUpcoming,
    openCreate,
    openEdit,
    closeDialog,
  }
})
