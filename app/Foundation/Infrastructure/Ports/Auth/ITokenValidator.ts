/**
 * @file ITokenValidator.ts
 * @description Token 验证 Port 接口
 *
 * 框架无关的认证抽象。
 * 任何模块都可以实现此接口以提供 Token 验证能力。
 * JwtGuardMiddleware 和 GravitoAuthRouter 只依赖此接口，
 * 不知道底层使用的是 Session、OAuth 或其他认证方案。
 */

/**
 * Token 验证结果接口
 */
export interface TokenValidationResult {
  /** 已认证的用户 ID */
  userId: string

  /** Session ID（用于管理已发行的 Token） */
  sessionId: string
}

/**
 * Token 验证 Port 接口
 *
 * 此接口定义了「验证 Bearer Token」的契约。
 * 实现方（如 Session 模块）负责：
 * - 解析 JWT Token
 * - 验证签名
 * - 检查过期时间
 * - 检查撤销状态
 * - 返回用户 ID 和 Session ID
 */
export interface ITokenValidator {
  /**
   * 验证 Bearer Token 的有效性
   *
   * @param token - JWT Token 字符串（不含 'Bearer ' 前缀）
   * @returns 验证成功时返回用户 ID 和 Session ID；
   *          验证失败时返回 null 或抛异常
   *
   * @throws 当 Token 格式无效或签名验证失败时可能抛异常
   *
   * @example
   * ```typescript
   * const result = await tokenValidator.validate(token)
   * if (result) {
   *   console.log(`Authenticated user: ${result.userId}`)
   * } else {
   *   console.log('Token validation failed')
   * }
   * ```
   */
  validate(token: string): Promise<TokenValidationResult | null>
}
