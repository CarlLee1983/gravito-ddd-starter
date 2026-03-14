/**
 * @file useTokenRefresh.ts
 * @description Token 自動刷新 Hook
 *
 * 功能：
 * - 定期檢查 Token 是否即將過期
 * - 自動調用 /api/auth/refresh 取得新 Token
 * - 刷新失敗時清除 Token 並重定向到登入頁
 */

import { useEffect, useRef } from 'react'
import {
  getToken,
  isTokenExpiringSoon,
  setTokenStorage,
  clearToken,
  decodeToken,
} from '../utils/tokenManager'
import { http } from '../utils'

/**
 * Token 刷新配置
 */
interface TokenRefreshConfig {
  enabled?: boolean // 是否啟用自動刷新，預設 true
  checkInterval?: number // 檢查間隔（毫秒），預設 60000 (1 分鐘)
  expiryThreshold?: number // 過期預警時間（分鐘），預設 5
  onRefreshSuccess?: (token: string) => void // 刷新成功回調
  onRefreshFailed?: () => void // 刷新失敗回調
}

/**
 * Token 刷新 Hook
 *
 * @param config - 刷新配置
 * @returns 刷新狀態物件
 *
 * @example
 * ```typescript
 * export function AuthProvider({ children }) {
 *   useTokenRefresh({
 *     enabled: true,
 *     checkInterval: 60000,
 *     expiryThreshold: 5,
 *   })
 *
 *   // ... rest of provider
 * }
 * ```
 */
export function useTokenRefresh(config: TokenRefreshConfig = {}) {
  const {
    enabled = true,
    checkInterval = 60000, // 1 分鐘
    expiryThreshold = 5, // 5 分鐘
    onRefreshSuccess,
    onRefreshFailed,
  } = config

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const checkAndRefreshToken = async () => {
      // 防止並發刷新
      if (isRefreshingRef.current) return

      const token = getToken()
      if (!token) return

      // 檢查是否即將過期
      if (!isTokenExpiringSoon(expiryThreshold)) return

      isRefreshingRef.current = true

      try {
        // 調用 /api/auth/refresh
        const response = await http.post('/api/auth/refresh', null, {
          skipErrorHandling: false,
        })

        if (response.success && response.data?.accessToken) {
          // 保存新 Token
          setTokenStorage(
            response.data.accessToken,
            response.data.expiresIn || 7 * 24 * 60 * 60 // 預設 7 天
          )

          console.log('[useTokenRefresh] Token 刷新成功')

          // 觸發成功回調
          if (onRefreshSuccess) {
            onRefreshSuccess(response.data.accessToken)
          }
        } else {
          throw new Error(response.message || 'Token 刷新失敗')
        }
      } catch (error) {
        console.error('[useTokenRefresh] Token 刷新失敗:', error)

        // 刷新失敗，清除 Token 並重定向
        clearToken()

        // 觸發失敗回調
        if (onRefreshFailed) {
          onRefreshFailed()
        } else {
          // 預設行為：重定向到登入頁
          if (typeof window !== 'undefined') {
            window.location.href = '/login?reason=token_expired'
          }
        }
      } finally {
        isRefreshingRef.current = false
      }
    }

    // 立即執行一次檢查
    checkAndRefreshToken()

    // 定期檢查
    intervalRef.current = setInterval(checkAndRefreshToken, checkInterval)

    // 清理函數
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, checkInterval, expiryThreshold, onRefreshSuccess, onRefreshFailed])

  return {
    isRefreshing: isRefreshingRef.current,
  }
}

/**
 * 獲取 Token 剩餘時間的 Hook
 *
 * @returns Token 剩餘時間（秒）或 null
 *
 * @example
 * ```typescript
 * const remainingTime = useTokenExpiryTime()
 * if (remainingTime && remainingTime < 300) {
 *   console.log('Token 即將過期')
 * }
 * ```
 */
export function useTokenExpiryTime(): number | null {
  const token = getToken()
  if (!token) return null

  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return null

  const now = Math.floor(new Date().getTime() / 1000)
  return decoded.exp - now
}

/**
 * 檢查 Token 是否有效的 Hook
 *
 * @returns Token 有效性
 *
 * @example
 * ```typescript
 * const isValid = useIsTokenValid()
 * if (!isValid) {
 *   return <Redirect to="/login" />
 * }
 * ```
 */
export function useIsTokenValid(): boolean {
  const token = getToken()
  if (!token) return false

  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return false

  const now = Math.floor(new Date().getTime() / 1000)
  return decoded.exp > now
}
