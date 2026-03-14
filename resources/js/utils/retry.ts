/**
 * @file retry.ts
 * @description 請求失敗重試工具 - 實現指數退避算法
 *
 * 用於處理網路抖動、暫時性伺服器錯誤等場景，自動重試失敗的請求。
 */

/**
 * 重試配置選項
 */
export interface RetryConfig {
  /**
   * 最大重試次數（不含首次嘗試）
   * 預設：3 次（共 4 次嘗試）
   */
  maxAttempts?: number

  /**
   * 初始延遲時間（毫秒）
   * 預設：1000 ms
   */
  initialDelay?: number

  /**
   * 最大延遲時間（毫秒）
   * 預設：30000 ms (30 秒)
   */
  maxDelay?: number

  /**
   * 延遲倍數（指數退避係數）
   * 預設：2 (延遲時間翻倍)
   */
  multiplier?: number

  /**
   * 是否在每次延遲中添加隨機抖動
   * 預設：true
   */
  useJitter?: boolean

  /**
   * 判斷是否應該重試的函數
   * 返回 true 表示應該重試，false 表示放棄
   */
  shouldRetry?: (error: any, attempt: number) => boolean
}

/**
 * 默認重試配置
 */
const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  useJitter: true,
  shouldRetry: (error, attempt) => {
    // 預設重試次數未達上限
    return true
  },
}

/**
 * 計算延遲時間（指數退避）
 *
 * 公式：min(initialDelay * (multiplier ^ attempt), maxDelay) + jitter
 *
 * @param attempt - 嘗試次數（從 0 開始）
 * @param config - 重試配置
 * @returns 延遲時間（毫秒）
 *
 * @example
 * attempt 0: 1000ms
 * attempt 1: 2000ms
 * attempt 2: 4000ms
 * attempt 3: 8000ms
 */
export function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.multiplier, attempt)
  const capped = Math.min(exponentialDelay, config.maxDelay)
  const jitter = config.useJitter ? Math.random() * capped * 0.1 : 0

  return capped + jitter
}

/**
 * 使用指數退避重試執行非同步函數
 *
 * @param fn - 要執行的非同步函數
 * @param config - 重試配置
 * @returns 執行結果
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * )
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  let lastError: any

  for (let attempt = 0; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 檢查是否應該重試
      if (attempt === finalConfig.maxAttempts) {
        throw error
      }

      if (!finalConfig.shouldRetry(error, attempt)) {
        throw error
      }

      // 計算延遲時間
      const delay = calculateDelay(attempt, finalConfig)

      console.log(
        `[Retry] 第 ${attempt + 1} 次失敗，${delay.toFixed(0)}ms 後重試...`,
        error
      )

      // 等待後重試
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * 建立可重試的 fetch wrapper
 *
 * 自動處理網路錯誤和某些 HTTP 錯誤的重試
 *
 * @example
 * ```typescript
 * const response = await retryFetch('/api/data', {
 *   method: 'GET',
 *   retryConfig: { maxAttempts: 3 }
 * })
 * ```
 */
export interface RetryFetchOptions extends RequestInit {
  retryConfig?: RetryConfig
}

/**
 * 可重試的 fetch 函數
 */
export async function retryFetch(
  url: string,
  options?: RetryFetchOptions
): Promise<Response> {
  const { retryConfig, ...fetchOptions } = options || {}

  return retry(
    () => fetch(url, fetchOptions),
    {
      ...retryConfig,
      shouldRetry: (error, attempt) => {
        // 優先使用自定義邏輯
        if (retryConfig?.shouldRetry) {
          return retryConfig.shouldRetry(error, attempt)
        }

        // 預設：網路錯誤時重試，其他情況由呼叫者決定
        if (error instanceof TypeError) {
          // 網路錯誤（離線、CORS 等）
          return true
        }

        return false
      },
    }
  )
}

/**
 * 建立可重試的 API 請求 wrapper
 *
 * 結合 retry 和 fetch，並自動處理 JSON 響應
 *
 * @example
 * ```typescript
 * const data = await retryRequest('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ test: true }),
 *   retryConfig: { maxAttempts: 3 }
 * })
 * ```
 */
export async function retryRequest<T = any>(
  url: string,
  options?: RetryFetchOptions
): Promise<T> {
  const response = await retryFetch(url, options)

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    Object.assign(error, { status: response.status, response })
    throw error
  }

  return response.json()
}
