import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const DEBUG_STORAGE_KEY = 'kanadere.debug.v1'

interface DebugState {
  showWatermark: boolean
  developerMode: boolean
}

function loadDebug(): DebugState {
  try {
    const raw = localStorage.getItem(DEBUG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DebugState>
      return {
        showWatermark: parsed.showWatermark === true,
        developerMode: parsed.developerMode === true,
      }
    }
  } catch {
    // 损坏数据降级为默认值
  }
  return { showWatermark: false, developerMode: false }
}

/** 开发者调试选项（本地持久化，非核心功能） */
export const useDebugStore = defineStore('debug', () => {
  const showWatermark = ref(loadDebug().showWatermark)
  const developerMode = ref(loadDebug().developerMode)

  watch(
    [showWatermark, developerMode],
    ([w, d]) => {
      try {
        localStorage.setItem(
          DEBUG_STORAGE_KEY,
          JSON.stringify({ showWatermark: w, developerMode: d }),
        )
      } catch {
        // 存储不可用时仅影响本次会话
      }
    },
  )

  function toggleWatermark() {
    showWatermark.value = !showWatermark.value
  }

  /** 连续点击版本号解锁开发者分区（弹窗确认后调用） */
  function unlockDeveloper() {
    developerMode.value = true
  }

  function reset() {
    showWatermark.value = false
    developerMode.value = false
  }

  return { showWatermark, developerMode, toggleWatermark, unlockDeveloper, reset }
})
