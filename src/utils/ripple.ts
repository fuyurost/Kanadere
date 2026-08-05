/**
 * MD3 涟漪（点击水波）——全局 pointer 委托，无需逐个绑定。
 *
 * 宿主元素由选择器列表指定（配合 base.css 中的 .ripple__wave 样式）：
 * - 设置行（非 disabled）：可点击设置项
 * - 日历 cell / 事件 chip：点击选择/编辑
 * - 侧边栏事件行：跳转主视图
 *
 * 涟漪从指针按下位置扩散，动画结束自动移除 DOM。
 */
const RIPPLE_HOSTS =
  '.settings__row:not(.settings__row--disabled), .dc, .dc__chip, .sidebar__event'

export function initRipple(): void {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target as HTMLElement
      const host = target.closest<HTMLElement>(RIPPLE_HOSTS)
      if (!host) return
      const rect = host.getBoundingClientRect()
      // 外接圆直径 ≈ 内缩圆角块对角线（inset 2px），涟漪扩散终点贴合遮罩，不溢出
      const d = Math.hypot(rect.width - 4, rect.height - 4)
      const wave = document.createElement('span')
      wave.className = 'ripple__wave'
      wave.style.width = `${d}px`
      wave.style.height = `${d}px`
      wave.style.left = `${e.clientX - rect.left - d / 2}px`
      wave.style.top = `${e.clientY - rect.top - d / 2}px`
      host.appendChild(wave)
      wave.addEventListener('animationend', () => wave.remove(), { once: true })
    },
    { passive: true },
  )
}
