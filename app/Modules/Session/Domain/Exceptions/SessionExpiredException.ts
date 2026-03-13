/**
 * @file SessionExpiredException.ts
 * @description Session 已過期或已撤銷異常
 *
 * 當嘗試使用無效的 Session 時拋出。
 */

/**
 * Session 已過期或已撤銷異常
 *
 * 用於 Token 驗證失敗的情況。
 */
export class SessionExpiredException extends Error {
  constructor(message: string = 'Session 已過期或已撤銷') {
    super(message)
    this.name = 'SessionExpiredException'
  }
}
