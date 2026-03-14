/**
 * @file ITokenSigner.ts
 * @description Token 簽發與驗證 Port 介面
 *
 * 框架無關的 JWT/Token 抽象。
 * 任何模組都可以實現此介面以提供 Token 簽發能力。
 * CreateSessionService 只依賴此介面，不知道底層使用的是 jose、jsonwebtoken 或其他 JWT 庫。
 */

/**
 * Token 簽發與驗證 Port 介面
 *
 * 此介面定義了「簽發與驗證 JWT Token」的契約。
 * 實現方負責：
 * - 從環境變數讀取 Secret
 * - 使用指定的演算法簽發 Token
 * - 驗證 Token 簽名與過期時間
 */
export interface ITokenSigner {
  /**
   * 簽發 JWT Token
   *
   * @param payload - Token Payload（任意物件）
   * @returns 簽發後的 Token 字串
   * @throws Error 如果簽發失敗（例如 Secret 未設定）
   */
  sign(payload: Record<string, unknown>): Promise<string>

  /**
   * 驗證 JWT Token
   *
   * @param token - JWT Token 字串
   * @returns 驗證成功時返回 Payload，失敗時返回 null
   * @throws Error 如果 Token 格式無效或簽名驗證失敗
   */
  verify(token: string): Promise<Record<string, unknown> | null>
}
