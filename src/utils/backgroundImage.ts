/**
 * 背景图片压缩（UI 层 canvas 平台能力；参考 utils/extractColor.ts 的 objectURL + Image + canvas 模式）。
 * 最长边 ≤ 1920、JPEG 质量 0.78、保持宽高比；JPEG 无 alpha，透明像素填白底。
 * 失败抛错由调用方处理。
 */

const MAX_EDGE = 1920
const JPEG_QUALITY = 0.78

/** File → 压缩后 dataURL（image/jpeg, base64）；失败抛错由调用方处理 */
export async function downscaleBackground(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = url
    })

    // 只缩小不放大；自然尺寸异常（如无固有尺寸的 SVG）时按 1×1 兜底
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight, 1))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 不可用')
    ctx.fillStyle = '#ffffff' // JPEG 无 alpha：透明像素填白底
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    URL.revokeObjectURL(url)
  }
}
