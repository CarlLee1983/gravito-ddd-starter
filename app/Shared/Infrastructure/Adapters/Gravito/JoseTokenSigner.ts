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
  private readonly jwtSecret: Uint8Array
  private readonly expiresIn: number // 秒數

  /**
   * 建構子
   *
   * @throws Error 如果 JWT_SECRET 未設定或 JWT_EXPIRES_IN 無效
   */
  constructor() {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET 環境變數未設定')
    }

    this.jwtSecret = new TextEncoder().encode(secret)

    // JWT 過期時間，預設 24 小時（86400 秒）
    const expiresInStr = process.env.JWT_EXPIRES_IN ?? '86400'
    this.expiresIn = parseInt(expiresInStr, 10)

    if (isNaN(this.expiresIn) || this.expiresIn <= 0) {
      throw new Error('JWT_EXPIRES_IN 必須是正整數（秒數）')
    }
  }

  /**
   * 簽發 JWT Token
   *
   * @param payload - Token Payload
   * @returns Promise<string> 簽發後的 Token 字串
   */
  async sign(payload: Record<string, unknown>): Promise<string> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.expiresIn * 1000)

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.jwtSecret)

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
      const verified = await jwtVerify(token, this.jwtSecret)
      return verified.payload
    } catch (error) {
      return null
    }
  }
}
