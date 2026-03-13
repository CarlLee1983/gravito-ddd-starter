/**
 * @file UserProfileAdapter.ts
 * @description User 模組對 IUserProfileService Port 的實現
 *
 * 將 User Repository 的用戶資料查詢能力適配到 IUserProfileService Port。
 */

import type { IUserProfileService, UserProfileResult } from '@/Shared/Infrastructure/Ports/Auth/IUserProfileService'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

/**
 * User 模組的用戶資料查詢服務
 *
 * 此類是一個適配器（Adapter Pattern），將 User 模組的用戶資料查詢能力
 * 適配到基礎設施層的 IUserProfileService Port。
 *
 * 職責：
 * - 接收用戶 ID
 * - 查詢用戶資訊
 * - 將領域實體轉換為標準化的結果格式
 * - 返回用戶資料或 null（用戶不存在）
 */
export class UserProfileAdapter implements IUserProfileService {
  /**
   * 建構函式
   *
   * @param userRepository - User Repository（用於查詢用戶）
   */
  constructor(private userRepository: IUserRepository) {}

  /**
   * 根據用戶 ID 查詢用戶資料
   *
   * @param userId - 用戶唯一識別碼
   * @returns 用戶存在時返回資料；不存在時返回 null
   */
  async findById(userId: string): Promise<UserProfileResult | null> {
    // 根據 ID 查詢用戶
    const user = await this.userRepository.findById(userId)

    // 用戶不存在
    if (!user) {
      return null
    }

    // 轉換為 Port 介面定義的結果格式
    return {
      id: user.id,
      name: user.name.value,
      email: user.email.value,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
