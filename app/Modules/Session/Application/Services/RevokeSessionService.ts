/**
 * @file RevokeSessionService.ts
 * @description 撤銷 Session（登出）應用服務
 */

import type { ISessionRepository } from '../../Domain/Repositories/ISessionRepository'
import { ValidateSessionService } from './ValidateSessionService'

/**
 * 撤銷 Session 應用服務
 *
 * 驗證 Token → 撤銷 Session（登出）
 */
export class RevokeSessionService {
  /**
   * 建構子
   *
   * @param sessionRepository - Session Repository
   * @param validateSessionService - 驗證服務
   */
  constructor(
    private sessionRepository: ISessionRepository,
    private validateSessionService: ValidateSessionService
  ) {}

  /**
   * 執行登出流程
   *
   * @param token - JWT Token 字串（不含 'Bearer ' 前綴）
   * @returns Promise<void>
   * @throws Error 如果 Token 無效
   */
  async execute(token: string): Promise<void> {
    // 驗證 Token
    const { sessionId } = await this.validateSessionService.validate(token)

    // 查詢 Session
    const session = await this.sessionRepository.findById(sessionId)
    if (!session) {
      throw new Error('Session 不存在')
    }

    // 撤銷 Session
    session.revoke()

    // 保存變更
    await this.sessionRepository.save(session)
  }
}
