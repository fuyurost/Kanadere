import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const DEBUG_STORAGE_KEY = 'kanadere.debug.v1'

interface DebugState {
  showWatermark: boolean
}

function loadDebug(): DebugState {
  try {
    const raw = localStorage.getItem(DEBUG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DebugState>
      return { showWatermark: parsed.showWatermark === true }
    }
  } catch {
    // 损坏数据降级为默认值
  }
  return { showWatermark: false }
}

/** 开发者调试选项（本地持久化，非核心功能） */
export const useDebugStore = defineStore('debug', () => {
  const showWatermark = ref(loadDebug().showWatermark)

  watch(
    showWatermark,
    (v) => {
      try {
        localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify({ showWatermark: v }))
      } catch {
        // 存储不可用时仅影响本次会话
      }
    },
  )

  function toggleWatermark() {
    showWatermark.value = !showWatermark.value
  }

  function reset() {
    showWatermark.value = false
  }

  return { showWatermark, toggleWatermark, reset }
})
