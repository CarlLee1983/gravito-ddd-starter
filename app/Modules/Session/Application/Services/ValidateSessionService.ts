/**
 * @file ValidateSessionService.ts
 * @description 驗證 Session（JWT 驗證）應用服務
 */

import type { ITokenSigner } from '@/Foundation/Infrastructure/Ports/Auth/ITokenSigner'
import type { ISessionRepository } from '../../Domain/Repositories/ISessionRepository'
import { SessionExpiredException } from '../../Domain/Exceptions/SessionExpiredException'

/**
 * 驗證結果介面
 */
export interface ValidationResult {
  userId: string
  sessionId: string
}

/**
 * 驗證 Session 應用服務
 *
 * 驗證 Bearer Token 並檢查 Session 有效性。
 *
 * 改進：現在依賴 ITokenSigner Port，而非直接使用 jose 庫。
 */
export class ValidateSessionService {
  /**
   * 建構子
   *
   * @param tokenSigner - Token 簽發器（Port 介面實現，用於驗證）
   * @param sessionRepository - Session Repository
   */
  constructor(
    private tokenSigner: ITokenSigner,
    private sessionRepository: ISessionRepository
  ) {}

  /**
   * 驗證 JWT Token 並檢查 Session 有效性
   *
   * @param token - JWT Token 字串（不含 'Bearer ' 前綴）
   * @returns Promise<ValidationResult> 驗證成功的結果
   * @throws SessionExpiredException 如果 Token 無效、Session 已過期或已撤銷
   */
  async validate(token: string): Promise<ValidationResult> {
    // 步驟 1: 驗證 JWT 簽名與過期時間（透過 Port 介面）
    const payload = await this.tokenSigner.verify(token)
    if (!payload) {
      throw new SessionExpiredException('無效的 Token 或簽名驗證失敗')
    }

    const userId = payload.sub as string
    const sessionId = payload.jti as string

    // 步驟 2: 從 sessionId 查詢 Session
    const session = await this.sessionRepository.findById(sessionId)
    if (!session) {
      throw new SessionExpiredException('Session 不存在')
    }

    // 步驟 3: 檢查 Session 有效性
    if (!session.isValid) {
      if (session.isExpired) {
        throw new SessionExpiredException('Session 已過期')
      }
      if (session.isRevoked) {
        throw new SessionExpiredException('Session 已被撤銷')
      }
    }

    // 步驟 4: 驗證 Token 中的用戶 ID 與 Session 中的用戶 ID 一致
    if (session.userId !== userId) {
      throw new SessionExpiredException('Token 與 Session 不匹配')
    }

    return {
      userId,
      sessionId,
    }
  }
}
