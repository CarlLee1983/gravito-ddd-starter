/**
 * @file SessionTokenValidator.ts
 * @description Session 模組對 ITokenValidator Port 的實現
 *
 * 將 ValidateSessionService（Domain Logic）適配到 ITokenValidator Port。
 */

import type { ITokenValidator, TokenValidationResult } from '@/Foundation/Infrastructure/Ports/Auth/ITokenValidator'
import { ValidateSessionService } from '../../Application/Services/ValidateSessionService'
import { SessionExpiredException } from '../../Domain/Exceptions/SessionExpiredException'

/**
 * Session 模組的 Token 驗證器
 *
 * 此類是一個適配器（Adapter Pattern），將應用層的 ValidateSessionService
 * 適配到基礎設施層的 ITokenValidator Port。
 *
 * 職責：
 * - 接收來自 JwtGuardMiddleware 的 Token 字串
 * - 委派給 ValidateSessionService 進行驗證
 * - 捕獲特定異常並返回 null（表示驗證失敗）
 * - 返回標準的 TokenValidationResult
 */
export class SessionTokenValidator implements ITokenValidator {
  /**
   * 建構子
   *
   * @param validateSessionService - 應用層的驗證服務
   */
  constructor(private validateSessionService: ValidateSessionService) {}

  /**
   * 驗證 Bearer Token
   *
   * @param token - JWT Token 字串
   * @returns Promise<TokenValidationResult | null> 驗證成功返回用戶 ID 和 Session ID；失敗返回 null
   */
  async validate(token: string): Promise<TokenValidationResult | null> {
    try {
      const result = await this.validateSessionService.validate(token)
      return {
        userId: result.userId,
        sessionId: result.sessionId,
      }
    } catch (error) {
      // 若驗證失敗（包括過期、撤銷、無效簽名等），返回 null
      // 這樣 JwtGuardMiddleware 可以統一處理失敗情況
      if (error instanceof SessionExpiredException) {
        return null
      }
      // 其他異常也返回 null（而不是重新拋出）
      // 這樣 Middleware 可以安全處理任何驗證失敗的情況
      return null
    }
  }
}
