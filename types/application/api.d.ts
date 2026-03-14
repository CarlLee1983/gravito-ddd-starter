/**
 * @file types/application/api.d.ts
 * @description API 相關的共享類型定義
 *
 * 包含：
 * - API 回應格式
 * - HTTP 狀態碼
 * - 認證相關
 */

// API 回應格式
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  meta?: ApiMeta
}

interface ApiMeta {
  total?: number
  page?: number
  limit?: number
  timestamp?: string
}

// HTTP 狀態碼
type HttpStatusCode =
  | 200 | 201 | 204  // Success
  | 400 | 401 | 403 | 404 | 409  // Client Error
  | 500 | 502 | 503  // Server Error

// 認證相關
interface AuthTokens {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
}

interface AuthContext {
  user: any | null
  isAuthenticated: boolean
  tokens?: AuthTokens
}

export {}
