/**
 * @file csrf.ts
 * @description CSRF Token 管理工具
 *
 * 防護跨站請求偽造攻擊，確保狀態變化請求（POST、PUT、DELETE）來自合法用戶。
 *
 * 策略：
 * - Token 儲存在 HTML meta 標籤中（由後端設定）
 * - 在所有狀態變化請求中附加 X-CSRF-Token header
 * - 後端驗證 Token 有效性
 */

const CSRF_HEADER_NAME = 'X-CSRF-Token'
const CSRF_META_NAME = 'csrf-token'

/**
 * 從 Meta 標籤讀取 CSRF Token
 *
 * HTML 中應包含：
 * <meta name="csrf-token" content="token_value" />
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null

  const meta = document.querySelector(`meta[name="${CSRF_META_NAME}"]`)
  if (!meta) return null

  return meta.getAttribute('content')
}

/**
 * 從回應標頭讀取新的 CSRF Token
 *
 * 某些端點可能返回新的 CSRF Token（如登入）
 */
export function getCsrfTokenFromHeader(headers: Headers): string | null {
  return headers.get(CSRF_HEADER_NAME)
}

/**
 * 設定 CSRF Token 到 Meta 標籤
 *
 * 當從 API 響應中收到新 Token 時，更新 Meta 標籤
 */
export function setCsrfToken(token: string): void {
  if (typeof document === 'undefined') return

  let meta = document.querySelector(`meta[name="${CSRF_META_NAME}"]`)

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', CSRF_META_NAME)
    document.head.appendChild(meta)
  }

  meta.setAttribute('content', token)
}

/**
 * 生成隨機 CSRF Token（用於測試）
 *
 * 在生產環境中，Token 應由後端生成
 */
export function generateRandomCsrfToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * 檢查是否需要 CSRF 保護
 *
 * GET 和 HEAD 請求不需要 CSRF Token
 * 其他方法（POST、PUT、DELETE、PATCH）需要 CSRF Token
 */
export function shouldProtectRequest(method: string): boolean {
  const unprotectedMethods = ['GET', 'HEAD', 'OPTIONS']
  return !unprotectedMethods.includes(method.toUpperCase())
}

/**
 * 驗證 CSRF Token 是否存在
 *
 * 用於檢查是否可以安全地發送狀態變化請求
 */
export function hasCsrfToken(): boolean {
  const token = getCsrfToken()
  return !!token && token.length > 0
}
