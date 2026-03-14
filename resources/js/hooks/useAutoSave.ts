/**
 * @file useAutoSave.ts
 * @description 自動儲存草稿 Hook - Debounce 自動儲存到 localStorage
 *
 * 功能：
 * - Debounce 自動儲存（避免頻繁儲存）
 * - localStorage 持久化
 * - 草稿恢復（不直接修改狀態）
 * - QuotaExceededError 處理
 * - SSR 安全
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useAutoSave 配置選項
 */
export interface UseAutoSaveOptions<T> {
  /**
   * Debounce 延遲（毫秒）
   * 預設: 2000
   */
  delay?: number

  /**
   * 是否啟用自動儲存
   * 預設: true
   */
  enabled?: boolean

  /**
   * 自定義序列化函數
   * 預設: JSON.stringify
   */
  serialize?: (data: T) => string

  /**
   * 自定義反序列化函數
   * 預設: JSON.parse
   */
  deserialize?: (json: string) => T
}

/**
 * useAutoSave 返回值
 */
export interface UseAutoSaveReturn {
  /**
   * 上次成功儲存的時間
   */
  savedAt: Date | null

  /**
   * 是否存在 localStorage 中的草稿
   */
  hasDraft: boolean

  /**
   * 是否正在儲存中
   */
  isSaving: boolean

  /**
   * 從 localStorage 恢復草稿數據
   * 不直接修改狀態，而是返回數據供外部處理
   */
  restoreDraft: () => any | null

  /**
   * 清除 localStorage 中的草稿
   */
  clearDraft: () => void
}

/**
 * 自動儲存 Hook
 *
 * 監聽數據變更，自動 debounce 儲存到 localStorage。
 * 適用於表單、編輯器等長篇幅編輯場景。
 *
 * @example
 * ```typescript
 * const [content, setContent] = useState('')
 *
 * const { savedAt, hasDraft, isSaving, restoreDraft, clearDraft } = useAutoSave(
 *   'my-draft',
 *   content,
 *   { delay: 1000 }
 * )
 *
 * useEffect(() => {
 *   // 頁面載入時恢復草稿
 *   if (hasDraft) {
 *     const draft = restoreDraft()
 *     if (draft) {
 *       setContent(draft)
 *     }
 *   }
 * }, [hasDraft])
 *
 * return (
 *   <div>
 *     <textarea
 *       value={content}
 *       onChange={(e) => setContent(e.target.value)}
 *     />
 *     {savedAt && <p>上次儲存: {savedAt.toLocaleTimeString()}</p>}
 *     {hasDraft && (
 *       <button onClick={clearDraft}>清除草稿</button>
 *     )}
 *   </div>
 * )
 * ```
 */
export function useAutoSave<T>(
  key: string,
  data: T,
  options: UseAutoSaveOptions<T> = {}
): UseAutoSaveReturn {
  const {
    delay = 2000,
    enabled = true,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options

  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  // 使用 useRef 儲存定時器和前次序列化結果
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const previousSerializedRef = useRef<string | null>(null)

  // 檢查是否存在草稿
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const draft = localStorage.getItem(key)
      setHasDraft(!!draft)

      // 嘗試讀取上次儲存時間
      const savedAtStr = localStorage.getItem(`${key}__savedAt`)
      if (savedAtStr) {
        setSavedAt(new Date(savedAtStr))
      }
    } catch (error) {
      console.warn('[useAutoSave] 讀取草稿失敗:', error)
    }
  }, [key])

  // 儲存到 localStorage
  const save = useCallback(async () => {
    if (typeof window === 'undefined') return

    try {
      setIsSaving(true)
      const serialized = serialize(data)

      // 如果序列化結果相同，跳過儲存（避免無意義儲存）
      if (previousSerializedRef.current === serialized) {
        setIsSaving(false)
        return
      }

      previousSerializedRef.current = serialized

      // 儲存數據
      localStorage.setItem(key, serialized)

      // 儲存時間戳
      const now = new Date()
      localStorage.setItem(`${key}__savedAt`, now.toISOString())

      setSavedAt(now)
      setHasDraft(true)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[useAutoSave] localStorage 已滿，無法儲存')
      } else {
        console.warn('[useAutoSave] 儲存失敗:', error)
      }
    } finally {
      setIsSaving(false)
    }
  }, [data, key, serialize])

  // Debounce 儲存
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    // 清除前一個定時器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // 設置新定時器
    timerRef.current = setTimeout(() => {
      save()
    }, delay)

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [data, enabled, delay, save])

  // 從 localStorage 恢復草稿
  const restoreDraft = useCallback(() => {
    if (typeof window === 'undefined') return null

    try {
      const draft = localStorage.getItem(key)
      if (!draft) return null

      return deserialize(draft)
    } catch (error) {
      console.warn('[useAutoSave] 恢復草稿失敗:', error)
      return null
    }
  }, [key, deserialize])

  // 清除草稿
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(key)
      localStorage.removeItem(`${key}__savedAt`)
      setHasDraft(false)
      setSavedAt(null)
      previousSerializedRef.current = null
    } catch (error) {
      console.warn('[useAutoSave] 清除草稿失敗:', error)
    }
  }, [key])

  // Cleanup：卸載時清除定時器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    savedAt,
    hasDraft,
    isSaving,
    restoreDraft,
    clearDraft,
  }
}
