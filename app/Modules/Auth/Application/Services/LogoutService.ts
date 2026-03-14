/**
 * @file LogoutService.ts
 * @description 登出應用服務
 */

import type { ISessionRepository } from '@/Modules/Session/Domain/Repositories/ISessionRepository'
import { ValidateSessionService } from '@/Modules/Session/Application/Services/ValidateSessionService'

/**
 * 登出應用服務
 *
 * 驗證 Token → 撤銷 Session（登出）
 */
export class LogoutService {
  /**
   * 建立 LogoutService 實例
   *
   * @param sessionRepository - Session 倉儲
   * @param validateSessionService - 驗證 Session 服務
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
   * @throws Error 如果 Token 無效或 Session 不存在
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
