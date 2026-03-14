/**
 * @file tokenManager.ts
 * @description Token 管理工具函數 - 負責 JWT Token 的存儲、提取和清除
 *
 * 策略：
 * - 主要存儲：HTTP-Only Cookie (auth_token) - 由後端設定，前端無法訪問
 * - 備用存儲：localStorage (用於前端 JS 發起的 API 請求)
 */

const TOKEN_COOKIE_NAME = 'auth_token'
const TOKEN_STORAGE_KEY = 'auth_token'
const TOKEN_EXPIRY_KEY = 'auth_token_expiry'

/**
 * 從 Cookie 讀取 Token
 * 用於頁面初始化和伺服器端 SSR 驗證
 */
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null

  const nameEQ = `${TOKEN_COOKIE_NAME}=`
  const cookies = document.cookie.split(';')

  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.startsWith(nameEQ)) {
      const token = cookie.substring(nameEQ.length)
      return token || null
    }
  }

  return null
}

/**
 * 從 localStorage 讀取 Token
 * 用於前端 JS 發起的 API 請求
 */
export function getTokenFromStorage(): string | null {
  if (typeof localStorage === 'undefined') return null

  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) return null

  // 檢查過期時間
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (expiry && new Date().getTime() > parseInt(expiry)) {
    clearTokenStorage()
    return null
  }

  return token
}

/**
 * 取得有效的 Token
 * 優先級：localStorage (最新) > Cookie (SSR)
 */
export function getToken(): string | null {
  // 優先使用 localStorage（確保是最新的）
  const storageToken = getTokenFromStorage()
  if (storageToken) return storageToken

  // 備用：Cookie（用於 SSR 或首次訪問）
  return getTokenFromCookie()
}

/**
 * 設定 Token 到 localStorage
 * 由登入/註冊 API 完成後調用
 */
export function setTokenStorage(token: string, expiresIn: number = 7 * 24 * 60 * 60): void {
  if (typeof localStorage === 'undefined') return

  localStorage.setItem(TOKEN_STORAGE_KEY, token)

  // 設定過期時間（秒轉毫秒）
  const expiry = new Date().getTime() + expiresIn * 1000
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString())
}

/**
 * 設定 Cookie
 * 通常由後端透過 Set-Cookie header 完成
 * 前端可用於測試或手動管理
 */
export function setTokenCookie(token: string, days: number = 7): void {
  if (typeof document === 'undefined') return

  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${date.toUTCString()}`

  // HTTP-Only Cookie 應由後端設定，這裡使用 Secure + SameSite
  document.cookie = `${TOKEN_COOKIE_NAME}=${token};${expires};path=/;SameSite=Strict`
}

/**
 * 清除 localStorage 中的 Token
 */
export function clearTokenStorage(): void {
  if (typeof localStorage === 'undefined') return

  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
}

/**
 * 清除 Cookie 中的 Token
 */
export function clearTokenCookie(): void {
  if (typeof document === 'undefined') return

  // 設定過期日期來刪除 Cookie
  document.cookie = `${TOKEN_COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}

/**
 * 清除所有 Token（Cookie + localStorage）
 */
export function clearToken(): void {
  clearTokenCookie()
  clearTokenStorage()
}

/**
 * 檢查 Token 是否有效
 */
export function isTokenValid(): boolean {
  const token = getToken()
  if (!token) return false

  // 簡單檢查：Token 應該是 3 個部分（header.payload.signature）
  const parts = token.split('.')
  return parts.length === 3
}

/**
 * 解碼 JWT Token 的 Payload（不驗證簽名）
 * 用於檢查 Token 中的信息（如 exp）
 */
export function decodeToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const decoded = JSON.parse(atob(parts[1]))
    return decoded
  } catch {
    return null
  }
}

/**
 * 檢查 Token 是否即將過期（在 N 分鐘內）
 */
export function isTokenExpiringSoon(minutesThreshold: number = 5): boolean {
  const token = getToken()
  if (!token) return true

  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return false

  const now = Math.floor(new Date().getTime() / 1000)
  const expiresIn = decoded.exp - now // 秒數

  return expiresIn < minutesThreshold * 60
}
