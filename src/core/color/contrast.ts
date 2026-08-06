/**
 * 前景色对比度选择（core 层纯函数，零平台依赖）。
 *
 * 相对亮度按 WCAG 2.x：sRGB 通道先归一化再线性化
 *   c ≤ 0.03928 → c/12.92；否则 ((c + 0.055) / 1.055) ^ 2.4
 *   L = 0.2126·R + 0.7152·G + 0.0722·B
 *
 * 阈值取 L = 0.4：高于阈值（偏亮背景）返回黑字，否则白字。
 * 依据：黑/白两分支的 WCAG 对比度在 L ≈ 0.179 处交叉
 *   （(L + 0.05) / 0.05 = 1.05 / (L + 0.05) → L = √0.032 ≈ 0.179），
 * 但阈值抬高到 0.4 使切换点偏向白字一侧：暗色主题的 on-token 前景
 * （如 on-error #690005，L ≈ 0.03）与常见自定义节日色均落在白字侧，
 * 边界附近两分支对比度仍 ≥ 2.33:1（L=0.4 处黑字 9.0:1 / 白字 2.33:1），
 * 避免反复横跳且默认状态与 MD3 主题色一致。
 */

/** sRGB 单通道线性化（WCAG 2.x） */
function linearize(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** 相对亮度（WCAG 2.x，0–1）；仅接受 '#RRGGBB'（store 校验层已保证格式） */
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex)
  if (!m) return 0
  const r = parseInt(m[1]!, 16) / 255
  const g = parseInt(m[2]!, 16) / 255
  const b = parseInt(m[3]!, 16) / 255
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** 背景色 → 可读前景色：亮度 > 0.4 返回 '#000000'，否则 '#FFFFFF' */
export function contrastForeground(hex: string): string {
  return relativeLuminance(hex) > 0.4 ? '#000000' : '#FFFFFF'
}
