/**
 * @file SessionDTO.ts
 * @description Session 回應 DTO
 */

/**
 * Session 回應 DTO
 *
 * 用於向前端返回 JWT Token 和相關信息。
 */
export interface SessionDTO {
  /** Access Token（JWT） */
  accessToken: string

  /** Token 過期時間（ISO 8601 字串） */
  expiresAt: string

  /** 用戶 ID */
  userId: string

  /** Token 類型（總是 'Bearer'） */
  tokenType: 'Bearer'
}
