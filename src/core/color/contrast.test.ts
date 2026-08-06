import { describe, it, expect } from 'vitest'
import { contrastForeground, relativeLuminance } from './contrast'

describe('contrastForeground', () => {
  it('纯黑背景返回白字', () => {
    expect(contrastForeground('#000000')).toBe('#FFFFFF')
  })

  it('纯白背景返回黑字', () => {
    expect(contrastForeground('#FFFFFF')).toBe('#000000')
  })

  it('中灰 #808080（L≈0.216 < 0.4）返回白字', () => {
    expect(contrastForeground('#808080')).toBe('#FFFFFF')
  })

  it('阈值上界 #00C600（L≈0.4039 > 0.4）返回黑字', () => {
    expect(relativeLuminance('#00C600')).toBeGreaterThan(0.4)
    expect(contrastForeground('#00C600')).toBe('#000000')
  })

  it('阈值下界 #00C400（L≈0.3948 < 0.4）返回白字', () => {
    expect(relativeLuminance('#00C400')).toBeLessThan(0.4)
    expect(contrastForeground('#00C400')).toBe('#FFFFFF')
  })

  it('大小写十六进制等价', () => {
    expect(contrastForeground('#ffffff')).toBe('#000000')
    expect(contrastForeground('#00c600')).toBe('#000000')
  })
})
