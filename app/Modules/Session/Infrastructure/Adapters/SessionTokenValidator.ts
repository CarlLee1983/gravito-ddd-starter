/**
 * @file SessionTokenValidator.ts
 * @description Session 模块对 ITokenValidator Port 的实现
 *
 * 将 ValidateSessionService（Domain Logic）适配到 ITokenValidator Port。
 */

import type { ITokenValidator, TokenValidationResult } from '@/Shared/Infrastructure/Ports/Auth/ITokenValidator'
import { ValidateSessionService } from '../../Application/Services/ValidateSessionService'
import { SessionExpiredException } from '../../Domain/Exceptions/SessionExpiredException'

/**
 * Session 模块的 Token 验证器
 *
 * 此类是一个适配器（Adapter Pattern），将应用层的 ValidateSessionService
 * 适配到基础设施层的 ITokenValidator Port。
 *
 * 职责：
 * - 接收来自 JwtGuardMiddleware 的 Token 字符串
 * - 委派给 ValidateSessionService 进行验证
 * - 捕获特定异常并返回 null（表示验证失败）
 * - 返回标准的 TokenValidationResult
 */
export class SessionTokenValidator implements ITokenValidator {
  /**
   * 构造函数
   *
   * @param validateSessionService - 应用层的验证服务
   */
  constructor(private validateSessionService: ValidateSessionService) {}

  /**
   * 验证 Bearer Token
   *
   * @param token - JWT Token 字符串
   * @returns 验证成功返回用户 ID 和 Session ID；失败返回 null
   */
  async validate(token: string): Promise<TokenValidationResult | null> {
    try {
      const result = await this.validateSessionService.validate(token)
      return {
        userId: result.userId,
        sessionId: result.sessionId,
      }
    } catch (error) {
      // 若验证失败（包括过期、撤销、无效签名等），返回 null
      // 这样 JwtGuardMiddleware 可以统一处理失败情况
      if (error instanceof SessionExpiredException) {
        return null
      }
      // 其他异常也返回 null（而不是重新抛出）
      // 这样 Middleware 可以安全处理任何验证失败的情况
      return null
    }
  }
}
