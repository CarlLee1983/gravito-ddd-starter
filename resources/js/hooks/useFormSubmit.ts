/**
 * @file useFormSubmit.ts
 * @description 表單提交 Hook - 防止重複提交和管理提交狀態
 *
 * 功能：
 * - 防止表單雙擊提交
 * - 管理提交狀態（loading、error、success）
 * - 自動表單驗證
 * - 集成與 http 工具的錯誤處理
 */

import { useState, useCallback, useRef } from 'react'
import { http, type HttpResponse } from '../utils'

/**
 * 表單提交結果類型
 */
export interface FormSubmitResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 表單提交 Hook 配置
 */
export interface UseFormSubmitConfig<T = any> {
  /**
   * 提交函數
   * 接收表單數據，返回提交結果
   */
  onSubmit: (data: any) => Promise<HttpResponse<T>>

  /**
   * 提交成功回調
   */
  onSuccess?: (data: T) => void

  /**
   * 提交失敗回調
   */
  onError?: (error: string) => void

  /**
   * 提交完成回調（無論成功或失敗）
   */
  onFinally?: () => void

  /**
   * 驗證表單數據（在提交前）
   */
  validate?: (data: any) => string | null

  /**
   * 提交前的前置處理
   */
  onBeforeSubmit?: (data: any) => any
}

/**
 * 表單提交狀態
 */
export interface FormSubmitState {
  isSubmitting: boolean
  isSuccess: boolean
  error: string | null
  reset: () => void
}

/**
 * 表單提交 Hook
 *
 * @param config - 配置選項
 * @returns { submit, state }
 *
 * @example
 * ```typescript
 * const { submit, state } = useFormSubmit({
 *   onSubmit: async (data) => {
 *     return http.post('/api/users', data)
 *   },
 *   onSuccess: (data) => {
 *     console.log('提交成功:', data)
 *   },
 *   validate: (data) => {
 *     if (!data.email) return '郵件為必填'
 *     return null
 *   }
 * })
 *
 * return (
 *   <form onSubmit={(e) => {
 *     e.preventDefault()
 *     submit(new FormData(e.currentTarget))
 *   }}>
 *     <input name="email" />
 *     <button disabled={state.isSubmitting}>
 *       {state.isSubmitting ? '提交中...' : '提交'}
 *     </button>
 *     {state.error && <div>{state.error}</div>}
 *   </form>
 * )
 * ```
 */
export function useFormSubmit<T = any>(
  config: UseFormSubmitConfig<T>
): {
  submit: (data: any) => Promise<void>
  state: FormSubmitState
} {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 防止並發提交的標誌
  const isSubmittingRef = useRef(false)

  const reset = useCallback(() => {
    setIsSuccess(false)
    setError(null)
  }, [])

  const submit = useCallback(
    async (formData: any) => {
      // 防止並發提交
      if (isSubmittingRef.current) {
        console.warn('[useFormSubmit] 正在提交中，請勿重複提交')
        return
      }

      // 清除之前的狀態
      reset()
      setIsSubmitting(true)
      isSubmittingRef.current = true

      try {
        // 提取表單數據（FormData 或 Object）
        let data: any
        if (formData instanceof FormData) {
          data = Object.fromEntries(formData)
        } else {
          data = formData
        }

        // 前置處理
        if (config.onBeforeSubmit) {
          data = config.onBeforeSubmit(data)
        }

        // 驗證
        if (config.validate) {
          const validationError = config.validate(data)
          if (validationError) {
            setError(validationError)
            if (config.onError) {
              config.onError(validationError)
            }
            return
          }
        }

        // 提交
        const response = await config.onSubmit(data)

        if (response.success && response.data) {
          setIsSuccess(true)
          if (config.onSuccess) {
            config.onSuccess(response.data)
          }
        } else {
          const errorMsg = response.message || '提交失敗'
          setError(errorMsg)
          if (config.onError) {
            config.onError(errorMsg)
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '提交出錯'
        setError(errorMsg)
        console.error('[useFormSubmit] 提交失敗:', err)
        if (config.onError) {
          config.onError(errorMsg)
        }
      } finally {
        setIsSubmitting(false)
        isSubmittingRef.current = false

        if (config.onFinally) {
          config.onFinally()
        }
      }
    },
    [config, reset]
  )

  return {
    submit,
    state: {
      isSubmitting,
      isSuccess,
      error,
      reset,
    },
  }
}

/**
 * 簡化版本：useFormSubmitSimple
 *
 * 用於簡單表單，自動處理最常見的場景
 *
 * @example
 * ```typescript
 * const { submit, isSubmitting, error } = useFormSubmitSimple(
 *   '/api/users',
 *   'POST',
 *   () => toast.success('成功！')
 * )
 * ```
 */
export function useFormSubmitSimple(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' = 'POST',
  onSuccess?: () => void
) {
  const { submit, state } = useFormSubmit({
    onSubmit: async (data) => {
      if (method === 'POST') {
        return http.post(url, data)
      } else if (method === 'PUT') {
        return http.put(url, data)
      } else {
        return http.patch(url, data)
      }
    },
    onSuccess,
  })

  return {
    submit,
    isSubmitting: state.isSubmitting,
    error: state.error,
    isSuccess: state.isSuccess,
    reset: state.reset,
  }
}
