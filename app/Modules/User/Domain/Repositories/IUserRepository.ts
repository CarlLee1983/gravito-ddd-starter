/**
 * @file IUserRepository.ts
 * @description 用戶資料倉儲介面 (Repository Interface)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：定義與持久化層互動的契約。
 * - 職責：描述如何存取與存儲用戶聚合根，使領域邏輯不依賴於特定的資料庫技術。
 *
 * Phase 2 改造：
 * - findByEmail 接受 Email ValueObject 而非原始字串
 * - 完整支持 ValueObject 驅動的查詢
 */

import type { IRepository } from '@/Foundation/Domain/IRepository'
import type { User } from '../Aggregates/User'
import type { Email } from '../ValueObjects/Email'

/**
 * 用戶倉儲契約介面
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * 根據 ID 查詢用戶
   * @param id - 用戶唯一識別碼
   */
  findById(id: string): Promise<User | null>

  /**
   * 按電子郵件查詢用戶
   * @param email - Email ValueObject
   */
  findByEmail(email: Email): Promise<User | null>

  /**
   * 保存用戶聚合根 (新增或更新)
   * @param user - 用戶聚合根
   */
  save(user: User): Promise<void>

  /**
   * 取得所有用戶列表 (已廢棄，建議使用 findAll)
   * @deprecated 使用 findAll() 代替
   */
  list(): Promise<User[]>
}
