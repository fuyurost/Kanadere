export type SwipeDirection = 'left' | 'right'

export const SWIPE_THRESHOLD = 64

export function resolveSwipeDirection(
  dx: number,
  dy: number,
  threshold: number = SWIPE_THRESHOLD,
): SwipeDirection | null {
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return null
  return dx < 0 ? 'left' : 'right'
}
