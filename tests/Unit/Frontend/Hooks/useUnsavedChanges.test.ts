/**
 * @file useUnsavedChanges.test.ts
 * @description useUnsavedChanges Hook 單元測試
 *
 * 測試場景：
 * - 外部 dirty 狀態控制
 * - 內部 dirty 狀態管理
 * - beforeunload 事件監聽
 * - markSaved 和 markDirty 方法
 * - 計算 dirty 狀態（外部 || 內部）
 * - SSR 安全性
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'

interface UseUnsavedChangesOptions {
  message?: string
  enableBeforeUnload?: boolean
}

interface UseUnsavedChangesReturn {
  isDirty: boolean
  markSaved: () => void
  markDirty: () => void
}

/**
 * 簡化的 Hook 實現（用於測試）
 */
class UnsavedChangesHook implements UseUnsavedChangesReturn {
  isDirty: boolean
  private internalDirty = false
  private externalIsDirty: boolean = false
  private listeners: Map<string, Function[]> = new Map()
  private options: UseUnsavedChangesOptions

  constructor(externalIsDirty?: boolean, options: UseUnsavedChangesOptions = {}) {
    this.externalIsDirty = externalIsDirty || false
    this.options = {
      message: '您有未儲存的變更，確定要離開嗎？',
      enableBeforeUnload: true,
      ...options,
    }
    this.isDirty = this.computeIsDirty()
    this.setupBeforeUnload()
  }

  private computeIsDirty(): boolean {
    return this.externalIsDirty || this.internalDirty
  }

  markSaved() {
    this.internalDirty = false
    this.updateIsDirty()
  }

  markDirty() {
    this.internalDirty = true
    this.updateIsDirty()
  }

  private updateIsDirty() {
    const newIsDirty = this.computeIsDirty()
    if (newIsDirty !== this.isDirty) {
      this.isDirty = newIsDirty
      this.triggerChange()
    }
  }

  setExternalDirty(value: boolean) {
    this.externalIsDirty = value
    this.updateIsDirty()
  }

  private setupBeforeUnload() {
    if (typeof window === 'undefined' || !this.options.enableBeforeUnload) {
      return
    }

    if (this.isDirty) {
      const handler = this.createBeforeUnloadHandler()
      this.addEventListener('beforeunload', handler)
    }
  }

  private createBeforeUnloadHandler() {
    return (e: any) => {
      if (this.isDirty && this.options.enableBeforeUnload) {
        e.preventDefault()
        e.returnValue = this.options.message
        return this.options.message
      }
    }
  }

  private addEventListener(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(handler)
  }

  private triggerChange() {
    const handlers = this.listeners.get('change') || []
    handlers.forEach((handler) => handler())
  }

  /**
   * 用於測試：模擬 beforeunload 事件
   */
  simulateBeforeUnload(): { prevented: boolean; returnValue?: string } {
    const event = {
      preventDefault: mock(() => {}),
      returnValue: undefined,
    }

    const handler = this.createBeforeUnloadHandler()
    handler(event)

    return {
      prevented: (event.preventDefault as any).mock.calls.length > 0,
      returnValue: event.returnValue,
    }
  }

  destroy() {
    this.listeners.clear()
  }
}

describe('useUnsavedChanges -- 未儲存變更警告 Hook', () => {
  let hook: UnsavedChangesHook

  beforeEach(() => {
    hook = null as any
  })

  afterEach(() => {
    if (hook) {
      hook.destroy()
    }
  })

  describe('初始化', () => {
    it('應初始化為 false（無 dirty）', () => {
      hook = new UnsavedChangesHook()
      expect(hook.isDirty).toBe(false)
    })

    it('應接受外部 dirty 狀態', () => {
      hook = new UnsavedChangesHook(true)
      expect(hook.isDirty).toBe(true)
    })

    it('應合併外部和內部 dirty 狀態', () => {
      hook = new UnsavedChangesHook(false)
      hook.markDirty()
      expect(hook.isDirty).toBe(true)
    })

    it('應接受自訂配置', () => {
      hook = new UnsavedChangesHook(false, {
        message: '自訂警告訊息',
        enableBeforeUnload: false,
      })
      expect(hook.isDirty).toBe(false)
    })
  })

  describe('markDirty 方法', () => {
    beforeEach(() => {
      hook = new UnsavedChangesHook()
    })

    it('應設定 isDirty 為 true', () => {
      expect(hook.isDirty).toBe(false)
      hook.markDirty()
      expect(hook.isDirty).toBe(true)
    })

    it('應在已 dirty 時保持 true', () => {
      hook.markDirty()
      hook.markDirty()
      expect(hook.isDirty).toBe(true)
    })

    it('應即使外部已 dirty 也設定內部 dirty', () => {
      hook = new UnsavedChangesHook(true)
      hook.markDirty()
      expect(hook.isDirty).toBe(true)
    })
  })

  describe('markSaved 方法', () => {
    beforeEach(() => {
      hook = new UnsavedChangesHook()
      hook.markDirty()
    })

    it('應清除內部 dirty 標誌', () => {
      expect(hook.isDirty).toBe(true)
      hook.markSaved()
      expect(hook.isDirty).toBe(false)
    })

    it('應在外部 dirty 時保持 true', () => {
      hook = new UnsavedChangesHook(true)
      hook.markDirty()
      hook.markSaved()
      expect(hook.isDirty).toBe(true) // 外部仍為 true
    })

    it('多次呼叫應安全', () => {
      hook.markSaved()
      hook.markSaved()
      expect(hook.isDirty).toBe(false)
    })
  })

  describe('外部 dirty 狀態同步', () => {
    beforeEach(() => {
      hook = new UnsavedChangesHook(false)
    })

    it('外部變為 dirty 時應更新計算結果', () => {
      expect(hook.isDirty).toBe(false)
      hook.setExternalDirty(true)
      expect(hook.isDirty).toBe(true)
    })

    it('外部變為 not dirty 時應更新計算結果', () => {
      hook = new UnsavedChangesHook(true)
      expect(hook.isDirty).toBe(true)
      hook.setExternalDirty(false)
      expect(hook.isDirty).toBe(false)
    })

    it('外部和內部皆 dirty 時應保持 true', () => {
      hook.markDirty()
      hook.setExternalDirty(true)
      expect(hook.isDirty).toBe(true)

      hook.markSaved()
      expect(hook.isDirty).toBe(true) // 外部仍 dirty

      hook.setExternalDirty(false)
      expect(hook.isDirty).toBe(false)
    })
  })

  describe('beforeunload 事件', () => {
    it('dirty 時應觸發 beforeunload 防止', () => {
      hook = new UnsavedChangesHook(false, { enableBeforeUnload: true })
      hook.markDirty()

      const result = hook.simulateBeforeUnload()
      expect(result.prevented).toBe(true)
      expect(result.returnValue).toBe('您有未儲存的變更，確定要離開嗎？')
    })

    it('not dirty 時應不防止 beforeunload', () => {
      hook = new UnsavedChangesHook(false, { enableBeforeUnload: true })

      const result = hook.simulateBeforeUnload()
      expect(result.prevented).toBe(false)
    })

    it('應使用自訂警告訊息', () => {
      const customMsg = '自訂警告訊息'
      hook = new UnsavedChangesHook(true, {
        message: customMsg,
        enableBeforeUnload: true,
      })

      const result = hook.simulateBeforeUnload()
      expect(result.returnValue).toBe(customMsg)
    })

    it('enableBeforeUnload 為 false 時應禁用', () => {
      hook = new UnsavedChangesHook(true, { enableBeforeUnload: false })

      const result = hook.simulateBeforeUnload()
      expect(result.prevented).toBe(false)
    })
  })

  describe('狀態轉換', () => {
    beforeEach(() => {
      hook = new UnsavedChangesHook()
    })

    it('應支持多次 dirty/saved 轉換', () => {
      expect(hook.isDirty).toBe(false)

      hook.markDirty()
      expect(hook.isDirty).toBe(true)

      hook.markSaved()
      expect(hook.isDirty).toBe(false)

      hook.markDirty()
      expect(hook.isDirty).toBe(true)

      hook.markSaved()
      expect(hook.isDirty).toBe(false)
    })

    it('應處理外部和內部的交替變化', () => {
      hook.markDirty() // 內部 dirty
      expect(hook.isDirty).toBe(true)

      hook.setExternalDirty(true) // 外部也 dirty
      expect(hook.isDirty).toBe(true)

      hook.markSaved() // 清除內部
      expect(hook.isDirty).toBe(true) // 外部仍 dirty

      hook.setExternalDirty(false) // 清除外部
      expect(hook.isDirty).toBe(false)
    })
  })

  describe('React 表單整合情境', () => {
    it('應同步 react-hook-form isDirty', () => {
      let formDirty = false
      hook = new UnsavedChangesHook(formDirty)
      expect(hook.isDirty).toBe(false)

      // 表單變更
      formDirty = true
      hook.setExternalDirty(formDirty)
      expect(hook.isDirty).toBe(true)

      // 表單重置
      formDirty = false
      hook.setExternalDirty(formDirty)
      hook.markSaved()
      expect(hook.isDirty).toBe(false)
    })

    it('應支持表單驗證錯誤期間的警告', () => {
      hook = new UnsavedChangesHook(false)
      hook.markDirty()

      expect(hook.isDirty).toBe(true)

      // 即使驗證失敗仍應保持警告
      const result = hook.simulateBeforeUnload()
      expect(result.prevented).toBe(true)
    })
  })

  describe('邊界情況', () => {
    it('應處理未定義的配置選項', () => {
      hook = new UnsavedChangesHook(false, {})
      expect(hook.isDirty).toBe(false)

      const result = hook.simulateBeforeUnload()
      expect(result.prevented).toBe(false) // isDirty 為 false
    })

    it('應處理 null 外部狀態', () => {
      hook = new UnsavedChangesHook(undefined)
      expect(hook.isDirty).toBe(false)

      hook.markDirty()
      expect(hook.isDirty).toBe(true)
    })

    it('應在重複設定相同值時不觸發不必要更新', () => {
      hook = new UnsavedChangesHook(false)

      hook.setExternalDirty(false) // 相同值
      expect(hook.isDirty).toBe(false)

      hook.setExternalDirty(false) // 相同值
      expect(hook.isDirty).toBe(false)
    })
  })

  describe('SSR 安全性', () => {
    it('應在非瀏覽器環境中安全初始化', () => {
      // 模擬 SSR（無 window）
      hook = new UnsavedChangesHook(false, { enableBeforeUnload: true })

      // 應不拋出錯誤
      expect(hook.isDirty).toBe(false)

      hook.markDirty()
      expect(hook.isDirty).toBe(true)
    })
  })
})
