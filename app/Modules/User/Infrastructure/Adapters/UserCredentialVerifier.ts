/**
 * @file UserCredentialVerifier.ts
 * @description User 模块对 ICredentialVerifier Port 的实现
 *
 * 将 User Repository 的凭证验证能力适配到 ICredentialVerifier Port。
 */

import type { ICredentialVerifier, CredentialVerificationResult } from '@/Foundation/Infrastructure/Ports/Auth/ICredentialVerifier'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import { Email } from '../../Domain/ValueObjects/Email'

/**
 * User 模块的凭证验证器
 *
 * 此类是一个适配器（Adapter Pattern），将 User 模块的凭证验证能力
 * 适配到基础设施层的 ICredentialVerifier Port。
 *
 * 职责：
 * - 接收邮箱和密码
 * - 查询用户信息
 * - 验证密码是否正确
 * - 返回用户 ID 或 null（验证失败）
 */
export class UserCredentialVerifier implements ICredentialVerifier {
  /**
   * 构造函数
   *
   * @param userRepository - User Repository（用于查询用户）
   */
  constructor(private userRepository: IUserRepository) {}

  /**
   * 通过邮箱和密码验证用户凭证
   *
   * @param email - 用户电子邮件
   * @param password - 用户密码（原文）
   * @returns 凭证有效返回用户 ID；无效返回 null
   */
  async verifyByEmail(
    email: string,
    password: string
  ): Promise<CredentialVerificationResult | null> {
    // 创建 Email ValueObject
    const emailVo = Email.create(email)

    // 按邮箱查询用户
    const user = await this.userRepository.findByEmail(emailVo)

    // 用户不存在
    if (!user) {
      return null
    }

    // 验证密码
    const passwordValid = await user.verifyPassword(password)

    // 返回结果
    return passwordValid ? { userId: user.id } : null
  }
}
