/**
 * @file ICredentialVerifier.ts
 * @description 凭证验证 Port 接口
 *
 * 框架无关的凭证验证抽象。
 * User 模块实现此接口以提供密码验证能力。
 * Session 模块（CreateSessionService）通过此接口验证用户凭证，
 * 而不直接依赖 User 模块的实现细节。
 */

/**
 * 凭证验证结果接口
 */
export interface CredentialVerificationResult {
  /** 凭证有效的用户 ID */
  userId: string
}

/**
 * 凭证验证 Port 接口
 *
 * 此接口定义了「验证用户凭证（邮箱+密码）」的契约。
 * 实现方（如 User 模块）负责：
 * - 查询用户信息
 * - 验证密码
 * - 返回用户 ID
 *
 * 这是 Session 和 User 两个 Bounded Context 之间的反腐敗層（Anti-Corruption Layer）。
 * 通过此接口，两个模块可以独立演进而无需直接耦合。
 */
export interface ICredentialVerifier {
  /**
   * 通过电子邮件和密码验证用户凭证
   *
   * @param email - 用户电子邮件
   * @param password - 用户密码（原文）
   * @returns 凭证有效时返回用户 ID；凭证无效时返回 null
   *
   * @throws 可能抛出与存储层有关的异常（如数据库错误）
   *
   * @example
   * ```typescript
   * const result = await credentialVerifier.verifyByEmail('user@example.com', 'password123')
   * if (result) {
   *   console.log(`User verified: ${result.userId}`)
   * } else {
   *   console.log('Invalid credentials')
   * }
   * ```
   */
  verifyByEmail(email: string, password: string): Promise<CredentialVerificationResult | null>
}
