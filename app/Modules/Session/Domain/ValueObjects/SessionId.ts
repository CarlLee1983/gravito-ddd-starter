/**
 * @file SessionId.ts
 * @description Session ID ValueObject
 *
 * 不可變值物件，代表唯一的 Session 識別符。
 */

/**
 * Session ID ValueObject
 *
 * 確保 Session ID 的一致性和有效性。
 */
export class SessionId {
  private readonly _value: string

  /**
   * 私有建構子，強制使用靜態工廠方法
   * @param value - Session ID 值
   * @private
   */
  private constructor(value: string) {
    this._value = value
  }

  /**
   * 建立 SessionId（無驗證，假設已由外層驗證）
   *
   * @param value - Session ID 字串
   * @returns SessionId
   * @throws Error 如果值為空
   */
  static create(value: string): SessionId {
    if (!value || value.trim().length === 0) {
      throw new Error('Session ID 不能為空')
    }
    return new SessionId(value)
  }

  /**
   * 產生新的 SessionId（使用 UUID）
   *
   * @returns SessionId
   */
  static generate(): SessionId {
    const sessionId = crypto.randomUUID()
    return new SessionId(sessionId)
  }

  /**
   * 取得 SessionId 值
   */
  get value(): string {
    return this._value
  }

  /**
   * 檢查是否相等
   *
   * @param other - 另一個 SessionId
   * @returns 是否相等
   */
  equals(other: SessionId): boolean {
    return this._value === other._value
  }

  /**
   * 字串表示
   */
  toString(): string {
    return this._value
  }
}
