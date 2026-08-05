import { describe, it, expect } from 'vitest'
import { resolveSwipeDirection } from './swipe'

describe('resolveSwipeDirection', () => {
  it('水平左滑 (-80,0) 返回 left', () => {
    expect(resolveSwipeDirection(-80, 0)).toBe('left')
  })

  it('水平右滑 (80,0) 返回 right', () => {
    expect(resolveSwipeDirection(80, 0)).toBe('right')
  })

  it('位移不足阈值 (40,0) 返回 null', () => {
    expect(resolveSwipeDirection(40, 0)).toBeNull()
  })

  it('恰好达到阈值 (-64,0) 返回 left', () => {
    expect(resolveSwipeDirection(-64, 0)).toBe('left')
  })

  it('垂直主导 (60,120) 返回 null', () => {
    expect(resolveSwipeDirection(60, 120)).toBeNull()
  })

  it('水平主导 (80,60) 返回 right', () => {
    expect(resolveSwipeDirection(80, 60)).toBe('right')
  })

  it('无位移 (0,0) 返回 null', () => {
    expect(resolveSwipeDirection(0, 0)).toBeNull()
  })
})
