/**
 * @file GetUserService.ts
 * @description 查詢用戶的應用服務 (Application Service)
 * @module app/Modules/User/Application/Services
 */

import { Email } from '../../Domain/ValueObjects/Email'
import { UserDTO } from '../DTOs/UserDTO'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

/**
 * GetUserService 類別
 *
 * 在 DDD 架構中作為「應用服務 (Application Service)」。
 * 負責協調查詢操作，將領域對象轉換為 DTO 供表現層使用。
 *
 * 職責：
 * 1. 透過 Repository 查詢用戶資料
 * 2. 將查詢結果轉換為 DTO
 * 3. 處理查詢錯誤和邊界情況
 */
export class GetUserService {
  /**
   * 建立 GetUserService 實例
   *
   * @param repository - 用戶倉儲介面
   */
  constructor(private repository: IUserRepository) {}

  /**
   * 按 ID 查詢單個用戶
   *
   * @param id - 用戶唯一識別碼
   * @returns Promise 包含用戶 DTO 或 null
   */
  async findById(id: string): Promise<UserDTO | null> {
    const user = await this.repository.findById(id)
    if (!user) {
      return null
    }
    return UserDTO.fromEntity(user)
  }

  /**
   * 按電子郵件查詢單個用戶
   *
   * @param email - 用戶電子郵件字串
   * @returns Promise 包含用戶 DTO 或 null
   */
  async findByEmail(email: string): Promise<UserDTO | null> {
    const emailVo = Email.create(email)
    const user = await this.repository.findByEmail(emailVo)
    if (!user) {
      return null
    }
    return UserDTO.fromEntity(user)
  }

  /**
   * 列出所有用戶
   *
   * @returns Promise 包含所有用戶的 DTO 陣列
   */
  async listAll(): Promise<UserDTO[]> {
    const users = await this.repository.findAll()
    return users.map(u => UserDTO.fromEntity(u))
  }
}
