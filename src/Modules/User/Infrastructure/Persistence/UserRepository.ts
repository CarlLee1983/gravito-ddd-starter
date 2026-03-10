/**
 * 用戶資料倉儲實現 (In-Memory)
 *
 * @internal - 此實現是基礎設施層細節，應通過 IUserRepository 使用
 *
 * 實現了 IUserRepository 介面，使用記憶體儲存（適合開發和測試）。
 * 可以輕鬆替換為資料庫版本（PostgresUserRepository、DrizzleUserRepository 等）
 * 而無需改動上層代碼。
 *
 * @design
 * - 完全實現 IRepository<User> 契約
 * - 支援基本 CRUD 操作
 * - 支援業務相關查詢（findByEmail）
 *
 * @see docs/REPOSITORY_ABSTRACTION_TEMPLATE.md - Repository 最佳實踐
 */

import { User } from '../../Domain/Aggregates/User'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

export class UserRepository implements IUserRepository {
  private users: Map<string, User> = new Map()

  // ============================================
  // 基礎 CRUD 操作（實現 IRepository<User>）
  // ============================================

  /**
   * 保存用戶（新增或更新）
   *
   * @param user - User 實體
   */
  async save(user: User): Promise<void> {
    this.users.set(user.id, user)
  }

  /**
   * 根據 ID 查詢用戶
   *
   * @param id - 用戶 ID
   * @returns User 實體或 null
   */
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  /**
   * 刪除用戶
   *
   * @param id - 用戶 ID
   */
  async delete(id: string): Promise<void> {
    this.users.delete(id)
  }

  /**
   * 查詢所有用戶（支援分頁）
   *
   * @param params - 查詢參數 { limit, offset }
   * @returns User 實體陣列
   */
  async findAll(params?: { limit?: number; offset?: number }): Promise<User[]> {
    let users = Array.from(this.users.values())

    // 應用分頁
    if (params?.offset) {
      users = users.slice(params.offset)
    }
    if (params?.limit) {
      users = users.slice(0, params.limit)
    }

    return users
  }

  /**
   * 計算用戶總數
   *
   * @param _params - 過濾條件（當前未使用）
   * @returns 用戶總數
   */
  async count(_params?: { [key: string]: any }): Promise<number> {
    return this.users.size
  }

  // ============================================
  // 業務相關方法（實現 IUserRepository）
  // ============================================

  /**
   * 按 Email 查詢用戶
   *
   * @param email - 用戶 email
   * @returns User 實體或 null
   */
  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  /**
   * 列出所有用戶（已棄用，使用 findAll() 代替）
   * @deprecated 使用 findAll() 代替
   */
  async list(): Promise<User[]> {
    return this.findAll()
  }
}
