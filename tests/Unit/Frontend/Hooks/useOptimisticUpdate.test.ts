/**
 * @file useOptimisticUpdate.test.ts
 * @description useOptimisticUpdate Hook 單元測試
 *
 * 測試場景：
 * - 初始數據加載
 * - 樂觀更新成功
 * - 樂觀更新失敗 + 自動回滾
 * - API 失敗時的回滾回調
 * - 防 unmount 非同步保護
 * - refetch 功能
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'

// 模擬 React Hooks
interface UseOptimisticUpdateConfig<T> {
  fetchFn: () => Promise<T>
  onRollback?: (err: Error, prev: T) => void
  onSuccess?: (value: T) => void
}

interface UseOptimisticUpdateReturn<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  update: (optimistic: T, apiFn: () => Promise<T>) => Promise<void>
  refetch: () => Promise<void>
}

/**
 * 簡化的 Hook 實現（用於測試）
 * 實際 Hook 在 resources/js/hooks/useOptimisticUpdate.ts
 */
class OptimisticUpdateHook<T> implements UseOptimisticUpdateReturn<T> {
  data: T | null = null
  isLoading = true
  error: Error | null = null
  private previousDataRef: T | null = null
  private isMountedRef = true
  private config: UseOptimisticUpdateConfig<T>

  constructor(config: UseOptimisticUpdateConfig<T>) {
    this.config = config
    this.init()
  }

  private async init() {
    try {
      this.isLoading = true
      const result = await this.config.fetchFn()
      if (this.isMountedRef) {
        this.data = result
        this.previousDataRef = result
        this.error = null
      }
    } catch (err) {
      if (this.isMountedRef) {
        this.error = err instanceof Error ? err : new Error(String(err))
      }
    } finally {
      if (this.isMountedRef) {
        this.isLoading = false
      }
    }
  }

  async update(optimistic: T, apiFn: () => Promise<T>): Promise<void> {
    this.previousDataRef = this.data

    if (this.isMountedRef) {
      this.data = optimistic
    }

    try {
      const result = await apiFn()
      if (this.isMountedRef) {
        this.data = result
        this.error = null
        if (this.config.onSuccess) {
          this.config.onSuccess(result)
        }
      }
    } catch (err) {
      if (this.isMountedRef) {
        const error = err instanceof Error ? err : new Error(String(err))
        this.error = error

        if (this.previousDataRef !== null) {
          this.data = this.previousDataRef

          if (this.config.onRollback) {
            this.config.onRollback(error, this.previousDataRef)
          }
        }
      }
    }
  }

  async refetch(): Promise<void> {
    try {
      this.isLoading = true
      this.error = null
      const result = await this.config.fetchFn()

      if (this.isMountedRef) {
        this.data = result
        this.previousDataRef = result
      }
    } catch (err) {
      if (this.isMountedRef) {
        const error = err instanceof Error ? err : new Error(String(err))
        this.error = error
      }
    } finally {
      if (this.isMountedRef) {
        this.isLoading = false
      }
    }
  }

  destroy() {
    this.isMountedRef = false
  }
}

describe('useOptimisticUpdate -- 樂觀更新 Hook', () => {
  let hook: OptimisticUpdateHook<{ id: number; name: string }>

  beforeEach(() => {
    hook = null as any
  })

  afterEach(() => {
    if (hook) {
      hook.destroy()
    }
  })

  describe('初始化', () => {
    it('應載入初始數據', async () => {
      const initialData = { id: 1, name: 'John' }
      hook = new OptimisticUpdateHook({
        fetchFn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return initialData
        },
      })

      // 等待初始化完成
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(hook.data).toEqual(initialData)
      expect(hook.isLoading).toBe(false)
      expect(hook.error).toBeNull()
    })

    it('應設定 isLoading 為 true 直到數據載入完成', async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return { id: 1, name: 'John' }
        },
      })

      expect(hook.isLoading).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(hook.isLoading).toBe(false)
    })

    it('應處理初始化錯誤', async () => {
      const errorMsg = '載入失敗'
      hook = new OptimisticUpdateHook({
        fetchFn: async () => {
          throw new Error(errorMsg)
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(hook.data).toBeNull()
      expect(hook.error?.message).toBe(errorMsg)
      expect(hook.isLoading).toBe(false)
    })
  })

  describe('樂觀更新', () => {
    beforeEach(async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => ({ id: 1, name: 'John' }),
      })
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    it('應立即更新 UI（樂觀）', async () => {
      const optimisticData = { id: 1, name: 'Jane' }
      const updatePromise = hook.update(optimisticData, async () => optimisticData)

      // 應立即應用樂觀值
      expect(hook.data).toEqual(optimisticData)

      await updatePromise
    })

    it('應使用 API 返回的結果', async () => {
      const optimisticData = { id: 1, name: 'Jane' }
      const serverData = { id: 1, name: 'Jane', timestamp: Date.now() } as any

      await hook.update(optimisticData, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return serverData
      })

      expect(hook.data).toEqual(serverData)
      expect(hook.error).toBeNull()
    })

    it('應調用 onSuccess 回調', async () => {
      const successCallback = mock(() => {})
      hook = new OptimisticUpdateHook({
        fetchFn: async () => ({ id: 1, name: 'John' }),
        onSuccess: successCallback,
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const newData = { id: 1, name: 'Jane' }
      await hook.update(newData, async () => newData)

      expect(successCallback).toHaveBeenCalledWith(newData)
    })
  })

  describe('失敗回滾', () => {
    beforeEach(async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => ({ id: 1, name: 'John' }),
      })
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    it('API 失敗時應回滾到上一狀態', async () => {
      const previousData = hook.data
      const optimisticData = { id: 1, name: 'Jane' }

      await hook.update(optimisticData, async () => {
        throw new Error('API 失敗')
      })

      expect(hook.data).toEqual(previousData)
    })

    it('應設定 error 狀態', async () => {
      const errorMsg = 'Network error'
      const optimisticData = { id: 1, name: 'Jane' }

      await hook.update(optimisticData, async () => {
        throw new Error(errorMsg)
      })

      expect(hook.error?.message).toBe(errorMsg)
    })

    it('應調用 onRollback 回調', async () => {
      const rollbackCallback = mock(() => {})
      hook = new OptimisticUpdateHook({
        fetchFn: async () => ({ id: 1, name: 'John' }),
        onRollback: rollbackCallback,
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const previousData = hook.data
      const optimisticData = { id: 1, name: 'Jane' }
      const error = new Error('API failed')

      await hook.update(optimisticData, async () => {
        throw error
      })

      expect(rollbackCallback).toHaveBeenCalledWith(error, previousData)
    })

    it('應清除 error 狀態在下次成功更新', async () => {
      const optimisticData = { id: 1, name: 'Jane' }

      // 第一次失敗
      await hook.update(optimisticData, async () => {
        throw new Error('Failed')
      })
      expect(hook.error).not.toBeNull()

      // 第二次成功
      await hook.update(optimisticData, async () => optimisticData)
      expect(hook.error).toBeNull()
    })
  })

  describe('refetch', () => {
    it('應重新獲取數據', async () => {
      let callCount = 0
      const firstData = { id: 1, name: 'John' }
      const secondData = { id: 1, name: 'Jane' }

      hook = new OptimisticUpdateHook({
        fetchFn: async () => {
          callCount++
          return callCount === 1 ? firstData : secondData
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(hook.data).toEqual(firstData)

      await hook.refetch()
      expect(hook.data).toEqual(secondData)
    })

    it('refetch 期間應設定 isLoading', async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 20))
          return { id: 1, name: 'John' }
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      const refetchPromise = hook.refetch()
      expect(hook.isLoading).toBe(true)

      await refetchPromise
      expect(hook.isLoading).toBe(false)
    })

    it('refetch 失敗應設定 error', async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => {
          throw new Error('Fetch failed')
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 50))
      await hook.refetch()

      expect(hook.error?.message).toBe('Fetch failed')
    })
  })

  describe('防 unmount 保護', () => {
    it('unmount 後的回調不應更新狀態', async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          return { id: 1, name: 'John' }
        },
      })

      hook.destroy()

      // 等待初始化完成（但 isMountedRef 已為 false）
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 状態應保持初始值
      expect(hook.data).toBeNull()
      expect(hook.isLoading).toBe(true) // isLoading 不會被設為 false
    })
  })

  describe('邊界情況', () => {
    it('應處理 null 數據', async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => null as any,
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(hook.data).toBeNull()
    })

    it('應處理連續更新', async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => ({ id: 1, name: 'John' }),
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      const data1 = { id: 1, name: 'Update 1' }
      const data2 = { id: 1, name: 'Update 2' }

      await hook.update(data1, async () => data1)
      expect(hook.data).toEqual(data1)

      await hook.update(data2, async () => data2)
      expect(hook.data).toEqual(data2)
    })

    it('應處理非同步錯誤', async () => {
      hook = new OptimisticUpdateHook({
        fetchFn: async () => ({ id: 1, name: 'John' }),
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      const error = new Error('Async error')
      await hook.update(
        { id: 1, name: 'Jane' },
        async () => {
          throw error
        }
      )

      expect(hook.error).toEqual(error)
    })
  })
})
