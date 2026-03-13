/**
 * @file Password.ts
 * @description 密碼 ValueObject
 *
 * 職責：
 * - 使用 Bun.password 進行雜湊和驗證
 * - 永遠不暴露原文密碼，toString() 回傳 '[protected]'
 * - 確保密碼驗證的安全性
 */

/**
 * 密碼 ValueObject
 *
 * 完全不可變，所有密碼操作透過靜態工廠方法進行。
 */
export class Password {
  private readonly _hash: string

  /**
   * 私有建構子，強制使用靜態工廠方法
   * @param hash - 已雜湊的密碼
   * @private
   */
  private constructor(hash: string) {
    this._hash = hash
  }

  /**
   * 從原文密碼建立（雜湊化）
   *
   * @param plain - 原文密碼
   * @returns Promise<Password> 雜湊後的密碼物件
   * @throws Error 如果密碼為空或雜湊失敗
   */
  static async fromPlainText(plain: string): Promise<Password> {
    if (!plain || plain.trim().length === 0) {
      throw new Error('密碼不能為空')
    }

    const hash = await Bun.password.hash(plain)
    return new Password(hash)
  }

  /**
   * 從雜湊值還原（不進行驗證，用於資料庫載入）
   *
   * @param hash - 已雜湊的密碼
   * @returns Password 密碼物件
   */
  static fromHash(hash: string): Password {
    if (!hash || hash.trim().length === 0) {
      throw new Error('密碼雜湊值不能為空')
    }
    return new Password(hash)
  }

  /**
   * 驗證原文密碼是否符合此雜湊值
   *
   * @param plain - 原文密碼
   * @returns Promise<boolean> 是否匹配
   */
  async verify(plain: string): Promise<boolean> {
    if (!plain) return false
    return await Bun.password.verify(plain, this._hash)
  }

  /**
   * 取得雜湊值（供 Repository 保存）
   */
  get hash(): string {
    return this._hash
  }

  /**
   * 永遠不暴露密碼，即使在日誌或錯誤訊息中
   */
  toString(): string {
    return '[protected]'
  }

  /**
   * 用於 JSON.stringify 時也不暴露密碼
   */
  toJSON(): string {
    return '[protected]'
  }
}
