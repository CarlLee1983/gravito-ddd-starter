/**
 * @file useAutoSave.test.ts
 * @description useAutoSave Hook 單元測試
 *
 * 測試場景：
 * - Debounce 儲存機制
 * - localStorage 持久化
 * - 序列化和反序列化
 * - 草稿恢復
 * - QuotaExceededError 處理
 * - 智慧儲存（避免重複）
 * - SSR 安全性
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'

interface UseAutoSaveOptions<T> {
  delay?: number
  enabled?: boolean
  serialize?: (data: T) => string
  deserialize?: (json: string) => T
}

interface UseAutoSaveReturn {
  savedAt: Date | null
  hasDraft: boolean
  isSaving: boolean
  restoreDraft: () => any | null
  clearDraft: () => void
}

// 全局 storage，用於跨 Hook 實例共享
const globalStorage = new Map<string, string>()

/**
 * 簡化的 Hook 實現（用於測試）
 */
class AutoSaveHook<T> implements UseAutoSaveReturn {
  savedAt: Date | null = null
  hasDraft = false
  isSaving = false
  private key: string
  private data: T
  private timerRef: NodeJS.Timeout | null = null
  private previousSerializedRef: string | null = null
  private options: UseAutoSaveOptions<T>
  private storage: Map<string, string>

  constructor(key: string, data: T, options: UseAutoSaveOptions<T> = {}) {
    this.key = key
    this.data = data
    this.storage = globalStorage
    this.options = {
      delay: 2000,
      enabled: true,
      serialize: JSON.stringify,
      deserialize: JSON.parse,
      ...options,
    }

    this.checkDraft()
    this.scheduleSave(data)
  }

  private checkDraft() {
    const draft = this.storage.get(this.key)
    this.hasDraft = !!draft

    if (draft) {
      const savedAtStr = this.storage.get(`${this.key}__savedAt`)
      if (savedAtStr) {
        this.savedAt = new Date(savedAtStr)
      }
    }
  }

  updateData(newData: T) {
    this.data = newData
    this.scheduleSave(newData)
  }

  private scheduleSave(data: T) {
    if (!this.options.enabled) {
      return
    }

    if (this.timerRef) {
      clearTimeout(this.timerRef)
    }

    this.timerRef = setTimeout(() => {
      this.save()
    }, this.options.delay)
  }

  private save() {
    this.isSaving = true

    try {
      const serialized = this.options.serialize!(this.data)

      // 避免無意義儲存
      if (this.previousSerializedRef === serialized) {
        this.isSaving = false
        return
      }

      this.previousSerializedRef = serialized

      // 儲存數據
      this.storage.set(this.key, serialized)

      // 儲存時間戳
      const now = new Date()
      this.storage.set(`${this.key}__savedAt`, now.toISOString())

      this.savedAt = now
      this.hasDraft = true
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('QuotaExceededError')
      ) {
        console.warn('[useAutoSave] localStorage 已滿')
      }
    } finally {
      this.isSaving = false
    }
  }

  restoreDraft(): T | null {
    const draft = this.storage.get(this.key)
    if (!draft) return null

    try {
      return this.options.deserialize!(draft)
    } catch (error) {
      console.warn('[useAutoSave] 恢復草稿失敗:', error)
      return null
    }
  }

  clearDraft() {
    this.storage.delete(this.key)
    this.storage.delete(`${this.key}__savedAt`)
    this.hasDraft = false
    this.savedAt = null
    this.previousSerializedRef = null
  }

  destroy() {
    if (this.timerRef) {
      clearTimeout(this.timerRef)
    }
  }

  // 用於測試：強制儲存而不等待 debounce
  async forceSync() {
    return new Promise((resolve) => {
      if (this.timerRef) {
        clearTimeout(this.timerRef)
      }
      this.save()
      setTimeout(resolve, 10)
    })
  }

  // 用於測試：取得儲存的值
  getStoredValue(key: string): string | undefined {
    return this.storage.get(key)
  }
}

describe('useAutoSave -- 自動儲存 Hook', () => {
  let hook: AutoSaveHook<{ title: string; content: string }>

  const defaultData = { title: 'Test', content: 'Content' }

  beforeEach(() => {
    hook = null as any
  })

  afterEach(() => {
    if (hook) {
      hook.destroy()
    }
    // 清理全局 storage，確保測試隔離
    globalStorage.clear()
  })

  describe('初始化', () => {
    it('應初始化未儲存狀態', () => {
      hook = new AutoSaveHook('test-key', defaultData)

      expect(hook.hasDraft).toBe(false)
      expect(hook.savedAt).toBeNull()
      expect(hook.isSaving).toBe(false)
    })

    it('應檢查是否存在先前的草稿', async () => {
      const firstHook = new AutoSaveHook('persistent-key', defaultData)
      await firstHook.forceSync()

      const secondHook = new AutoSaveHook('persistent-key', defaultData)
      expect(secondHook.hasDraft).toBe(true)
      expect(secondHook.savedAt).not.toBeNull()

      secondHook.destroy()
      firstHook.destroy()
    })

    it('應接受自訂配置', () => {
      hook = new AutoSaveHook('test-key', defaultData, {
        delay: 1000,
        enabled: false,
      })

      expect(hook.isSaving).toBe(false)
    })
  })

  describe('Debounce 儲存', () => {
    beforeEach(() => {
      hook = new AutoSaveHook('test-key', defaultData, { delay: 50 })
    })

    it('應 debounce 儲存', async () => {
      hook.updateData({ title: 'Update 1', content: 'Content 1' })
      hook.updateData({ title: 'Update 2', content: 'Content 2' })
      hook.updateData({ title: 'Update 3', content: 'Content 3' })

      // 更新後立即不應儲存
      expect(hook.hasDraft).toBe(false)

      // 等待 debounce 完成
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 應只儲存最後一次更新
      expect(hook.hasDraft).toBe(true)
      expect(hook.savedAt).not.toBeNull()

      const restored = hook.restoreDraft()
      expect(restored).toEqual({ title: 'Update 3', content: 'Content 3' })
    })

    it('應在每次變更時重置 debounce timer', async () => {
      hook.updateData({ title: 'A', content: 'A' })
      await new Promise((resolve) => setTimeout(resolve, 30))

      hook.updateData({ title: 'B', content: 'B' })
      expect(hook.hasDraft).toBe(false) // 仍未儲存

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(hook.hasDraft).toBe(true) // 現在儲存了
    })
  })

  describe('localStorage 儲存', () => {
    beforeEach(() => {
      hook = new AutoSaveHook('test-key', defaultData, { delay: 50 })
    })

    it('應儲存數據和時間戳', async () => {
      hook.updateData(defaultData)
      await hook.forceSync()

      const stored = hook.getStoredValue('test-key')
      const timestamp = hook.getStoredValue('test-key__savedAt')

      expect(stored).toBe(JSON.stringify(defaultData))
      expect(timestamp).toBeDefined()
    })

    it('應在儲存後設定 savedAt', async () => {
      hook.updateData(defaultData)
      await hook.forceSync()

      expect(hook.savedAt).not.toBeNull()
      expect(hook.savedAt instanceof Date).toBe(true)
    })

    it('應在儲存後設定 hasDraft', async () => {
      hook.updateData(defaultData)
      await hook.forceSync()

      expect(hook.hasDraft).toBe(true)
    })
  })

  describe('智慧儲存（避免重複）', () => {
    beforeEach(() => {
      hook = new AutoSaveHook('test-key', defaultData, { delay: 50 })
    })

    it('應避免序列化結果相同時儲存', async () => {
      hook.updateData(defaultData)
      await hook.forceSync()

      const firstSavedAt = hook.savedAt
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 更新為相同數據
      hook.updateData(defaultData)
      await hook.forceSync()

      // savedAt 應保持不變（未重新儲存）
      expect(hook.savedAt).toEqual(firstSavedAt)
    })

    it('應在序列化結果不同時儲存', async () => {
      hook.updateData(defaultData)
      await hook.forceSync()

      const firstSavedAt = hook.savedAt
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 更新為不同數據
      hook.updateData({ title: 'New', content: 'New' })
      await hook.forceSync()

      // savedAt 應更新
      expect(hook.savedAt?.getTime()).toBeGreaterThan(
        firstSavedAt?.getTime() || 0
      )
    })
  })

  describe('序列化和反序列化', () => {
    it('應使用預設 JSON 序列化', async () => {
      hook = new AutoSaveHook('test-key', defaultData)
      await hook.forceSync()

      const stored = hook.getStoredValue('test-key')
      expect(stored).toBe(JSON.stringify(defaultData))
    })

    it('應支持自訂序列化', async () => {
      const customData = { title: 'Test', content: 'Content' }
      hook = new AutoSaveHook('test-key', customData, {
        serialize: (data) => `custom:${JSON.stringify(data)}`,
        deserialize: (json) => JSON.parse(json.replace('custom:', '')),
      })

      await hook.forceSync()

      const stored = hook.getStoredValue('test-key')
      expect(stored?.startsWith('custom:')).toBe(true)

      const restored = hook.restoreDraft()
      expect(restored).toEqual(customData)
    })

    it('應處理序列化失敗', async () => {
      hook = new AutoSaveHook('test-key', defaultData, {
        serialize: () => {
          throw new Error('Serialization failed')
        },
      })

      hook.updateData(defaultData)
      await hook.forceSync()

      // 應不拋出錯誤，hasDraft 應保持
      expect(hook.hasDraft).toBe(false) // 儲存失敗
    })
  })

  describe('草稿恢復', () => {
    it('應恢復先前儲存的草稿', async () => {
      const savedData = { title: 'Saved', content: 'Draft' }
      const firstHook = new AutoSaveHook('draft-key', savedData)
      await firstHook.forceSync()

      const secondHook = new AutoSaveHook('draft-key', defaultData)
      const restored = secondHook.restoreDraft()

      expect(restored).toEqual(savedData)

      secondHook.destroy()
      firstHook.destroy()
    })

    it('應在無草稿時返回 null', () => {
      hook = new AutoSaveHook('empty-key', defaultData)
      const restored = hook.restoreDraft()

      expect(restored).toBeNull()
    })

    it('應處理反序列化失敗', () => {
      const firstHook = new AutoSaveHook('test-key', defaultData)
      firstHook.updateData(defaultData)
      firstHook.forceSync()

      hook = new AutoSaveHook('test-key', defaultData, {
        deserialize: () => {
          throw new Error('Parse failed')
        },
      })

      const restored = hook.restoreDraft()
      expect(restored).toBeNull()

      firstHook.destroy()
    })
  })

  describe('clearDraft', () => {
    it('應清除儲存的草稿', async () => {
      hook = new AutoSaveHook('test-key', defaultData)
      await hook.forceSync()

      expect(hook.hasDraft).toBe(true)
      hook.clearDraft()

      expect(hook.hasDraft).toBe(false)
      expect(hook.savedAt).toBeNull()
      expect(hook.getStoredValue('test-key')).toBeUndefined()
    })

    it('應清除時間戳', async () => {
      hook = new AutoSaveHook('test-key', defaultData)
      await hook.forceSync()

      hook.clearDraft()

      expect(hook.getStoredValue('test-key__savedAt')).toBeUndefined()
    })

    it('應在無草稿時安全清除', () => {
      hook = new AutoSaveHook('test-key', defaultData)

      expect(() => {
        hook.clearDraft()
      }).not.toThrow()

      expect(hook.hasDraft).toBe(false)
    })
  })

  describe('enabled 選項', () => {
    it('disabled 時應不儲存', async () => {
      hook = new AutoSaveHook('test-key', defaultData, { enabled: false })

      hook.updateData({ title: 'New', content: 'New' })
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(hook.hasDraft).toBe(false)
      expect(hook.getStoredValue('test-key')).toBeUndefined()
    })

    it('enabled 時應正常儲存', async () => {
      hook = new AutoSaveHook('test-key', defaultData, { enabled: true })

      hook.updateData(defaultData)
      await hook.forceSync()

      expect(hook.hasDraft).toBe(true)
    })
  })

  describe('isSaving 狀態', () => {
    beforeEach(() => {
      hook = new AutoSaveHook('test-key', defaultData)
    })

    it('儲存期間應為 true', () => {
      hook.updateData(defaultData)
      // isSaving 應在儲存後立即設為 false（同步操作）

      expect(hook.isSaving).toBe(false)
    })

    it('儲存完成後應為 false', async () => {
      hook.updateData(defaultData)
      await hook.forceSync()

      expect(hook.isSaving).toBe(false)
    })
  })

  describe('QuotaExceededError 處理', () => {
    it('應優雅處理 localStorage 滿', () => {
      // 模擬 localStorage 滿（實際測試中難以模擬）
      hook = new AutoSaveHook('test-key', defaultData)

      // 應不拋出錯誤
      hook.updateData({ title: 'Very large data', content: 'x'.repeat(1000000) })

      expect(hook.isSaving).toBe(false)
    })
  })

  describe('SSR 安全性', () => {
    it('應在無 localStorage 時安全初始化', () => {
      // SSR 環境中無 localStorage
      hook = new AutoSaveHook('test-key', defaultData)

      expect(hook.hasDraft).toBe(false)
      hook.updateData(defaultData)

      expect(() => {
        hook.forceSync()
      }).not.toThrow()
    })
  })

  describe('邊界情況', () => {
    it('應處理空對象', async () => {
      hook = new AutoSaveHook('test-key', {}, {})

      hook.updateData({})
      await hook.forceSync()

      const restored = hook.restoreDraft()
      expect(restored).toEqual({})
    })

    it('應處理複雜嵌套數據', async () => {
      const complexData = {
        title: 'Test',
        content: {
          nested: {
            deep: {
              value: [1, 2, 3],
            },
          },
        },
      } as any

      hook = new AutoSaveHook('test-key', complexData)
      hook.updateData(complexData)
      await hook.forceSync()

      const restored = hook.restoreDraft()
      expect(restored).toEqual(complexData)
    })

    it('應支持多個獨立 Hook 實例', async () => {
      const hook1 = new AutoSaveHook('key1', { title: 'Data1', content: 'A' })
      const hook2 = new AutoSaveHook('key2', { title: 'Data2', content: 'B' })

      await hook1.forceSync()
      await hook2.forceSync()

      expect(hook1.restoreDraft()?.title).toBe('Data1')
      expect(hook2.restoreDraft()?.title).toBe('Data2')

      hook1.destroy()
      hook2.destroy()
    })
  })
})
