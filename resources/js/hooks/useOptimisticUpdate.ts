/**
 * @file useOptimisticUpdate.ts
 * @description 樂觀 UI 更新 Hook - 立即更新 UI，失敗自動回滾
 *
 * 功能：
 * - 立即更新 UI（樂觀更新），改善 UX 響應速度
 * - API 失敗時自動回滾到上一狀態
 * - 防止 unmount 後的非同步回調副作用
 * - 支持自定義回滾回調
 */

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * 樂觀更新 Hook 配置
 */
export interface UseOptimisticUpdateConfig<T> {
  /**
   * 初始數據獲取函數
   * 組件掛載時執行，用於獲取最新數據
   */
  fetchFn: () => Promise<T>

  /**
   * 回滾回調
   * 當更新失敗時調用，提供錯誤和上一狀態
   */
  onRollback?: (err: Error, prev: T) => void

  /**
   * 成功回調
   * 當更新成功時調用
   */
  onSuccess?: (value: T) => void
}

/**
 * 樂觀更新返回值
 */
export interface UseOptimisticUpdateReturn<T> {
  /**
   * 當前數據（樂觀或伺服器確認的）
   */
  data: T | null

  /**
   * 是否正在載入初始數據
   */
  isLoading: boolean

  /**
   * 錯誤資訊
   */
  error: Error | null

  /**
   * 執行樂觀更新
   * @param optimistic - 樂觀更新值（立即應用到 UI）
   * @param apiFn - API 調用函數（非同步確認）
   */
  update: (optimistic: T, apiFn: () => Promise<T>) => Promise<void>

  /**
   * 重新獲取數據
   */
  refetch: () => Promise<void>
}

/**
 * 樂觀更新 Hook
 *
 * 用於改善表單提交和資料更新的使用者體驗。
 * 立即在 UI 上反映更改，同時在背景進行 API 調用，
 * 若失敗則自動回滾。
 *
 * @example
 * ```typescript
 * const { data, update, error } = useOptimisticUpdate({
 *   fetchFn: async () => {
 *     const res = await userApi.getById('123')
 *     return res.data
 *   },
 *   onRollback: (err, prev) => {
 *     toast.error(`更新失敗，已恢復: ${err.message}`)
 *   }
 * })
 *
 * const handleNameChange = async (newName: string) => {
 *   await update(
 *     { ...data, name: newName },
 *     () => userApi.update('123', { name: newName })
 *   )
 * }
 * ```
 */
export function useOptimisticUpdate<T>(
  config: UseOptimisticUpdateConfig<T>
): UseOptimisticUpdateReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 引用以防 unmount 後的非同步操作
  const isMountedRef = useRef(true)
  const previousDataRef = useRef<T | null>(null)

  // 使用 useRef 存儲最新的 fetchFn 和 config 回調，避免 closure 問題
  const fetchFnRef = useRef(config.fetchFn)
  const onRollbackRef = useRef(config.onRollback)
  const onSuccessRef = useRef(config.onSuccess)

  useEffect(() => {
    fetchFnRef.current = config.fetchFn
    onRollbackRef.current = config.onRollback
    onSuccessRef.current = config.onSuccess
  }, [config.fetchFn, config.onRollback, config.onSuccess])

  // 初始數據載入
  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await fetchFnRef.current()

        if (!cancelled && isMountedRef.current) {
          setData(result)
          previousDataRef.current = result
        }
      } catch (err) {
        if (!cancelled && isMountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  // 執行樂觀更新
  const update = useCallback(
    async (optimistic: T, apiFn: () => Promise<T>): Promise<void> => {
      // 保存上一狀態（用於回滾）
      previousDataRef.current = data

      // 立即更新 UI
      if (isMountedRef.current) {
        setData(optimistic)
      }

      try {
        // API 調用
        const result = await apiFn()

        // 成功：使用 API 返回的結果
        if (isMountedRef.current) {
          setData(result)
          setError(null)
          if (onSuccessRef.current) {
            onSuccessRef.current(result)
          }
        }
      } catch (err) {
        // 失敗：回滾到上一狀態
        if (isMountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)

          // 回滾 UI
          if (previousDataRef.current !== null) {
            setData(previousDataRef.current)

            if (onRollbackRef.current) {
              onRollbackRef.current(error, previousDataRef.current)
            }
          }
        }
      }
    },
    [data]
  )

  // 重新獲取數據
  const refetch = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await fetchFnRef.current()

      if (isMountedRef.current) {
        setData(result)
        previousDataRef.current = result
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    data,
    isLoading,
    error,
    update,
    refetch,
  }
}
