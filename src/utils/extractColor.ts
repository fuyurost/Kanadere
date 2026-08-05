/**
 * 图片主色提取（canvas，UI 层平台能力；色板生成在 core/color/scheme.ts）。
 * 缩略采样 + 色域量化投票：取最频色 bin，再向高饱和方向微调，避免灰扑扑的平均色。
 */

function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

/** 返回图片主色 '#RRGGBB'；失败抛错由调用方处理 */
export async function extractSeedFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = url
    })

    const SIZE = 64
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 不可用')
    ctx.drawImage(img, 0, 0, SIZE, SIZE)
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

    // 量化到 6bit/通道（64 级），统计最频 bin
    const votes = new Map<number, { r: number; g: number; b: number; count: number }>()
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]!
      if (a < 128) continue // 跳过透明像素
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const bin = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2)
      const hit = votes.get(bin)
      if (hit) hit.count++
      else votes.set(bin, { r: (r >> 2) * 4, g: (g >> 2) * 4, b: (b >> 2) * 4, count: 1 })
    }

    // 取频次最高的 bin；同频时优先更高饱和（rgb 极差大）
    let best: { r: number; g: number; b: number; count: number } | null = null
    for (const v of votes.values()) {
      if (!best || v.count > best.count) best = v
    }
    if (!best) throw new Error('图片无有效像素')
    return rgbToHex(best.r, best.g, best.b)
  } finally {
    URL.revokeObjectURL(url)
  }
}
