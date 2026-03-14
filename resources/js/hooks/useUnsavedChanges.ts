/**
 * @file useUnsavedChanges.ts
 * @description 未儲存變更警告 Hook - 提醒用戶未儲存的改動
 *
 * 功能：
 * - 在瀏覽器 beforeunload 事件時顯示警告
 * - 支持外部控制和內部狀態的 dirty 合並
 * - SSR 安全
 * - Inertia SPA 相容性提示
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * useUnsavedChanges 配置選項
 */
export interface UseUnsavedChangesOptions {
  /**
   * beforeunload 事件警告訊息
   * 預設: '您有未儲存的變更，確定要離開嗎？'
   */
  message?: string

  /**
   * 是否啟用 beforeunload 事件監聽
   * 預設: true
   */
  enableBeforeUnload?: boolean
}

/**
 * useUnsavedChanges 返回值
 */
export interface UseUnsavedChangesReturn {
  /**
   * 當前是否有未儲存變更
   */
  isDirty: boolean

  /**
   * 標記為已儲存（清除 dirty 標誌）
   */
  markSaved: () => void

  /**
   * 標記為有未儲存變更
   */
  markDirty: () => void
}

/**
 * 未儲存變更警告 Hook
 *
 * 監聽表單變更，在用戶嘗試離開頁面時顯示警告。
 * 支持外部控制的 dirty 狀態（如表單庫 react-hook-form）。
 *
 * @example
 * ```typescript
 * // 使用外部 dirty 狀態（推薦）
 * const { isDirty: formDirty, reset } = useForm()
 * const { isDirty, markSaved } = useUnsavedChanges(formDirty)
 *
 * const handleSave = async (data) => {
 *   await api.save(data)
 *   markSaved()
 *   reset()
 * }
 *
 * // 組件中
 * return <form>...</form>
 * ```
 *
 * ```typescript
 * // 使用內部狀態（簡單場景）
 * const { isDirty, markDirty, markSaved } = useUnsavedChanges(false, {
 *   message: '確定要離開嗎？有改動尚未保存。'
 * })
 *
 * const handleChange = () => {
 *   markDirty()
 * }
 *
 * const handleSave = async () => {
 *   await api.save()
 *   markSaved()
 * }
 * ```
 *
 * @note
 * Inertia.js 提示：SPA 導航不觸發 beforeunload 事件。
 * 若需要在 Inertia 導航前攔截，請使用：
 * ```typescript
 * router.on('before', (visit) => {
 *   if (isDirty && !confirm('有未儲存變更，確定要離開嗎？')) {
 *     return false
 *   }
 * })
 * ```
 */
export function useUnsavedChanges(
  externalIsDirty?: boolean,
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesReturn {
  const {
    message = '您有未儲存的變更，確定要離開嗎？',
    enableBeforeUnload = true,
  } = options

  // 內部 dirty 狀態（用於 markDirty/markSaved）
  const [internalDirty, setInternalDirty] = useState(false)

  // 計算的 dirty 狀態（外部或內部任一為 true 則為 true）
  const computedIsDirty = externalIsDirty || internalDirty

  // 標記為已儲存
  const markSaved = useCallback(() => {
    setInternalDirty(false)
  }, [])

  // 標記為有未儲存變更
  const markDirty = useCallback(() => {
    setInternalDirty(true)
  }, [])

  // 設置 beforeunload 事件監聽
  useEffect(() => {
    // SSR 安全檢查
    if (typeof window === 'undefined' || !enableBeforeUnload) {
      return
    }

    // 當有未儲存變更時，添加警告
    if (computedIsDirty) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = message
        return message
      }

      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [computedIsDirty, enableBeforeUnload, message])

  return {
    isDirty: computedIsDirty,
    markSaved,
    markDirty,
  }
}
