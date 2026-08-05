import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  type Scheme,
} from '@material/material-color-utilities'

/**
 * 动态取色：种子色 → MD3 色板（Material You）。
 *
 * core 层纯算法（零平台依赖，material-color-utilities 为纯 TS）：
 * 图片主色提取（canvas）在 UI 层完成，本模块只做颜色科学。
 */

export interface SchemePalette {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  inversePrimary: string
}

export interface SchemeSet {
  dark: SchemePalette
  light: SchemePalette
}

const PALETTE_KEYS = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
] as const

function pick(scheme: Scheme): SchemePalette {
  const palette = {} as SchemePalette
  for (const key of PALETTE_KEYS) {
    palette[key] = hexFromArgb(scheme[key] as number)
  }
  return palette
}

/** 种子色（'#RRGGBB'）→ 暗/亮两套主色板（与静态方案同组 5 个 token） */
export function generateSchemeFromSeed(seedHex: string): SchemeSet {
  const theme = themeFromSourceColor(argbFromHex(seedHex))
  return { dark: pick(theme.schemes.dark), light: pick(theme.schemes.light) }
}
