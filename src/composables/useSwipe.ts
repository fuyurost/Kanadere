import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { resolveSwipeDirection, type SwipeDirection } from '../core/calendar/swipe'

export function useSwipeNavigation(
  root: Ref<HTMLElement | null>,
  onSwipe: (dir: SwipeDirection) => void,
): void {
  let startX = 0
  let startY = 0
  let swiping = false

  function onStart(e: TouchEvent) {
    swiping = false
    if (e.touches.length !== 1) return
    startX = e.touches[0]!.clientX
    startY = e.touches[0]!.clientY
  }

  function onMove(e: TouchEvent) {
    if (e.touches.length !== 1) return
    const dx = e.touches[0]!.clientX - startX
    const dy = e.touches[0]!.clientY - startY
    if (!swiping && resolveSwipeDirection(dx, dy) !== null) swiping = true
    if (swiping) e.preventDefault()
  }

  function onEnd(e: TouchEvent) {
    if (!swiping || e.changedTouches.length !== 1) {
      swiping = false
      return
    }
    const t = e.changedTouches[0]!
    const dir = resolveSwipeDirection(t.clientX - startX, t.clientY - startY)
    if (dir) onSwipe(dir)
    swiping = false
  }

  onMounted(() => {
    const el = root.value
    if (!el) return
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
  })

  onBeforeUnmount(() => {
    const el = root.value
    if (!el) return
    el.removeEventListener('touchstart', onStart)
    el.removeEventListener('touchmove', onMove)
    el.removeEventListener('touchend', onEnd)
  })
}
