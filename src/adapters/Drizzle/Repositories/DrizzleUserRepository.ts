/**
 * Drizzle User Repository 實現
 *
 * 使用 Drizzle ORM 的 User Repository 實現
 * 完全實現 IUserRepository 介面，與 IDatabaseAccess 無關
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
import { User } from '@/Modules/User/Domain/Aggregates/User'

/**
 * Drizzle User Repository 實現
 *
 * 提供使用 Drizzle ORM 的用戶資料訪問
 */
export class DrizzleUserRepository implements IUserRepository {
  constructor(private db: IDatabaseAccess) {}

  /**
   * 根據 ID 查詢用戶
   *
   * @param id 用戶 ID
   * @returns User 實體或 null
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').where('id', '=', id).first()

    if (!row) {
      return null
    }

    return this.toDomain(row)
  }

  /**
   * 根據 Email 查詢用戶
   *
   * @param email 用戶 email
   * @returns User 實體或 null
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .table('users')
      .where('email', '=', email)
      .first()

    if (!row) {
      return null
    }

    return this.toDomain(row)
  }

  /**
   * 查詢所有用戶（支援分頁）
   *
   * @param params 查詢參數 { limit, offset }
   * @returns User 實體陣列
   */
  async findAll(params?: { limit?: number; offset?: number }): Promise<User[]> {
    let query = this.db.table('users')

    if (params?.offset) {
      query = query.offset(params.offset)
    }

    if (params?.limit) {
      query = query.limit(params.limit)
    }

    const rows = await query.select()

    return rows.map((row) => this.toDomain(row))
  }

  /**
   * 計算用戶總數
   *
   * @returns 用戶總數
   */
  async count(): Promise<number> {
    return this.db.table('users').count()
  }

  /**
   * 保存用戶（新增或更新）
   *
   * @param user User 實體
   */
  async save(user: User): Promise<void> {
    const row = this.toRow(user)

    // 先嘗試查詢，決定是 insert 還是 update
    const existing = await this.db
      .table('users')
      .where('id', '=', user.id)
      .first()

    if (existing) {
      await this.db
        .table('users')
        .where('id', '=', user.id)
        .update(row)
    } else {
      await this.db.table('users').insert(row)
    }
  }

  /**
   * 刪除用戶
   *
   * @param id 用戶 ID
   */
  async delete(id: string): Promise<void> {
    await this.db.table('users').where('id', '=', id).delete()
  }

  /**
   * 列出所有用戶（已棄用，使用 findAll() 代替）
   * @deprecated 使用 findAll() 代替
   */
  async list(): Promise<User[]> {
    return this.findAll()
  }

  /**
   * 將資料庫記錄轉換為 Domain 實體
   *
   * @private
   */
  private toDomain(row: any): User {
    return User.fromDatabase({
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      created_at: row.created_at as string | Date,
    })
  }

  /**
   * 將 Domain 實體轉換為資料庫記錄
   *
   * @private
   */
  private toRow(user: User): Record<string, unknown> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}
