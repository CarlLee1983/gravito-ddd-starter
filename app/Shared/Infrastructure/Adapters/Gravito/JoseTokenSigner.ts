/**
 * @file JoseTokenSigner.ts
 * @description 基於 jose 庫的 Token 簽發與驗證實現
 *
 * 此 Adapter 實現 ITokenSigner 介面，使用 jose 庫進行 JWT 操作。
 * 未來如果要切換到其他 JWT 庫（如 jsonwebtoken），只需新增新的 Adapter 實現。
 */

import { SignJWT, jwtVerify } from 'jose'
import type { ITokenSigner } from '../../Ports/Auth/ITokenSigner'

/**
 * 基於 jose 的 Token 簽發與驗證實現
 */
export class JoseTokenSigner implements ITokenSigner {
  private jwtSecret: Uint8Array | null = null
  private expiresIn: number | null = null

  /**
   * 初始化密鑰和過期時間（延遲驗證，直到實際使用時）
   *
   * @throws Error 如果 JWT_SECRET 未設定或 JWT_EXPIRES_IN 無效
   */
  private ensureInitialized(): void {
    if (this.jwtSecret === null) {
      const secret = process.env.JWT_SECRET
      if (!secret) {
        throw new Error('JWT_SECRET 環境變數未設定')
      }
      this.jwtSecret = new TextEncoder().encode(secret)
    }

    if (this.expiresIn === null) {
      const expiresInStr = process.env.JWT_EXPIRES_IN ?? '86400'
      this.expiresIn = parseInt(expiresInStr, 10)

      if (isNaN(this.expiresIn) || this.expiresIn <= 0) {
        throw new Error('JWT_EXPIRES_IN 必須是正整數（秒數）')
      }
    }
  }

  /**
   * 簽發 JWT Token
   *
   * @param payload - Token Payload
   * @returns Promise<string> 簽發後的 Token 字串
   */
  async sign(payload: Record<string, unknown>): Promise<string> {
    this.ensureInitialized()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (this.expiresIn as number) * 1000)

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.jwtSecret as Uint8Array)

    return token
  }

  /**
   * 驗證 JWT Token
   *
   * @param token - JWT Token 字串
   * @returns Promise<Record<string, unknown> | null> 驗證成功時返回 Payload，失敗時返回 null
   */
  async verify(token: string): Promise<Record<string, unknown> | null> {
    try {
      this.ensureInitialized()
      const verified = await jwtVerify(token, this.jwtSecret as Uint8Array)
      return verified.payload
    } catch (error) {
      return null
    }
  }
}
