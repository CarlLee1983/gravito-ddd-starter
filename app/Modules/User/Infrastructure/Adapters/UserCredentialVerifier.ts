/**
 * @file UserCredentialVerifier.ts
 * @description User 模組對 ICredentialVerifier Port 的實現
 *
 * 將 User Repository 的憑證驗證能力適配到 ICredentialVerifier Port。
 */

import type { ICredentialVerifier, CredentialVerificationResult } from '@/Foundation/Infrastructure/Ports/Auth/ICredentialVerifier'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import { Email } from '../../Domain/ValueObjects/Email'

/**
 * User 模組的憑證驗證器
 *
 * 此類是一個適配器（Adapter Pattern），將 User 模組的憑證驗證能力
 * 適配到基礎設施層的 ICredentialVerifier Port。
 *
 * 職責：
 * - 接收郵箱和密碼
 * - 查詢用戶資訊
 * - 驗證密碼是否正確
 * - 返回用戶 ID 或 null（驗證失敗）
 */
export class UserCredentialVerifier implements ICredentialVerifier {
  /**
   * 建構子
   *
   * @param userRepository - User Repository（用於查詢用戶）
   */
  constructor(private userRepository: IUserRepository) {}

  /**
   * 透過郵箱和密碼驗證用戶憑證
   *
   * @param email - 用戶電子郵件
   * @param password - 用戶密碼（原文）
   * @returns 憑證有效返回用戶 ID；無效返回 null
   */
  async verifyByEmail(
    email: string,
    password: string
  ): Promise<CredentialVerificationResult | null> {
    // 建立 Email ValueObject
    const emailVo = Email.create(email)

    // 按郵箱查詢用戶
    const user = await this.userRepository.findByEmail(emailVo)

    // 用戶不存在
    if (!user) {
      return null
    }

    // 驗證密碼
    const passwordValid = await user.verifyPassword(password)

    // 返回結果
    return passwordValid ? { userId: user.id } : null
  }
}
