import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CalendarEvent, EventDraft, EventOccurrence } from '../core/events/types'
import {
  getEventsForDate as engineGetEventsForDate,
  getEventsInRange as engineGetEventsInRange,
  getUpcomingEvents as engineGetUpcomingEvents,
  validateEvent,
} from '../core/events/engine'

const STORAGE_KEY = 'kanadere.events.v1'

export type EventDialogState =
  | { mode: 'create'; date: string; time?: string }
  | { mode: 'edit'; id: string }
  | null

function loadEvents(): CalendarEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CalendarEvent[]
  } catch {
    return [] // 损坏数据静默降级为空，不崩溃
  }
}

export const useEventsStore = defineStore('events', () => {
  const events = ref<CalendarEvent[]>(loadEvents())
  const dialog = ref<EventDialogState>(null)

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.value))
  }

  function createEvent(draft: EventDraft): CalendarEvent {
    const errors = validateEvent(draft)
    if (errors.length > 0) throw new Error(errors[0])
    const event: CalendarEvent = { ...draft, id: crypto.randomUUID() }
    events.value.push(event)
    persist()
    return event
  }

  function updateEvent(id: string, draft: EventDraft): void {
    const event = events.value.find((e) => e.id === id)
    if (!event) throw new Error('事件不存在')
    const errors = validateEvent(draft)
    if (errors.length > 0) throw new Error(errors[0])
    Object.assign(event, draft)
    persist()
  }

  function deleteEvent(id: string): void {
    events.value = events.value.filter((e) => e.id !== id)
    persist()
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
    events,
    dialog,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getEventsInRange,
    getUpcoming,
    openCreate,
    openEdit,
    closeDialog,
  }
})
