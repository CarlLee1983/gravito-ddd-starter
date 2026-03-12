/**
 * @file GetUserService.ts
 * @description 查詢用戶的應用服務 (Application Service)
 * @module app/Modules/User/Application/Services
 *
 * 實現 CQRS 讀寫分離：
 * - 實現 IUserQueryService 介面
 * - 提供讀側查詢服務，返回 UserReadModel
 */

import { Email } from '../../Domain/ValueObjects/Email'
import { UserDTO } from '../DTOs/UserDTO'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import type { IUserQueryService } from '../Queries/IUserQueryService'
import type { UserReadModel } from '../ReadModels/UserReadModel'

/**
 * GetUserService 類別
 *
 * 在 DDD 架構中作為「應用服務 (Application Service)」，同時實現 CQRS 讀側。
 * 負責協調查詢操作，將領域對象轉換為 ReadModel 供表現層使用。
 *
 * 職責：
 * 1. 透過 Repository 查詢用戶資料
 * 2. 將查詢結果轉換為 ReadModel
 * 3. 處理查詢錯誤和邊界情況
 */
export class GetUserService implements IUserQueryService {
  /**
   * 建立 GetUserService 實例
   *
   * @param repository - 用戶倉儲介面
   */
  constructor(private repository: IUserRepository) {}

  /**
   * 按 ID 查詢單個用戶 (IQuerySide 介面)
   *
   * @param id - 用戶唯一識別碼
   * @returns Promise 包含用戶 ReadModel 或 null
   */
  async findById(id: string): Promise<UserReadModel | null> {
    const user = await this.repository.findById(id)
    if (!user) {
      return null
    }
    return this.toReadModel(UserDTO.fromEntity(user))
  }

  /**
   * 查詢所有用戶 (IQuerySide 介面)
   *
   * @param filters - 查詢篩選器，包含分頁參數
   * @returns Promise 包含用戶 ReadModel 陣列
   */
  async findAll(filters?: { limit?: number; offset?: number }): Promise<UserReadModel[]> {
    const users = await this.repository.findAll(filters)
    return users.map(u => this.toReadModel(UserDTO.fromEntity(u)))
  }

  /**
   * 計算用戶總數 (IQuerySide 介面)
   *
   * @returns Promise 包含用戶總數
   */
  async count(): Promise<number> {
    return this.repository.count()
  }

  /**
   * 按電子郵件查詢單個用戶 (IUserQueryService 介面)
   *
   * @param email - 用戶電子郵件字串
   * @returns Promise 包含用戶 ReadModel 或 null
   */
  async findByEmail(email: string): Promise<UserReadModel | null> {
    const emailVo = Email.create(email)
    const user = await this.repository.findByEmail(emailVo)
    if (!user) {
      return null
    }
    return this.toReadModel(UserDTO.fromEntity(user))
  }

  /**
   * 列出所有用戶（已棄用，使用 findAll() 代替）
   * @deprecated 使用 findAll() 代替
   * @returns Promise 包含所有用戶的 DTO 陣列
   */
  async listAll(): Promise<UserDTO[]> {
    const users = await this.repository.findAll()
    return users.map(u => UserDTO.fromEntity(u))
  }

  /**
   * 將 UserDTO 轉換為 ReadModel
   *
   * @param dto - 用戶 DTO
   * @returns UserReadModel
   * @private
   */
  private toReadModel(dto: UserDTO): UserReadModel {
    const json = dto.toJSON()
    return {
      id: json.id,
      name: json.name,
      email: json.email,
      createdAt: json.createdAt,
    }
  }
}
