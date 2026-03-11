/**
 * 用戶資料倉儲實現 (ORM 無關)
 *
 * @internal - 此實現是基礎設施層細節，應通過 IUserRepository 使用
 *
 * 設計：
 * - 依賴 IDatabaseAccess（由上層注入；無 DB 時上層注入 MemoryDatabaseAccess）
 * - 完全實現 IRepository<User> 契約
 * - 支援基本 CRUD 操作與業務查詢（findByEmail）
 * - 不知道底層是真實 DB 或內存（完全透過 IDatabaseAccess 抽象）
 *
 * 架構優勢：
 * ✅ 單一 Repository 實現，無 if (db) 分支
 * ✅ 內存/數據庫由上層處理，底層僅依賴 Port
 *
 * @see docs/REPOSITORY_ABSTRACTION_TEMPLATE.md - Repository 最佳實踐
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { User } from '../../Domain/Aggregates/User'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

export class UserRepository implements IUserRepository {
	constructor(private readonly db: IDatabaseAccess) {}

	// ============================================
	// 基礎 CRUD 操作（實現 IRepository<User>）
	// ============================================

	/**
	 * 保存用戶（新增或更新）
	 *
	 * @param user - User 實體
	 */
	async save(user: User): Promise<void> {
		const row = this.toRow(user)
		const existing = await this.db.table('users').where('id', '=', user.id).first()
		if (existing) {
			await this.db.table('users').where('id', '=', user.id).update(row)
		} else {
			await this.db.table('users').insert(row)
		}
	}

	/**
	 * 根據 ID 查詢用戶
	 *
	 * @param id - 用戶 ID
	 * @returns User 實體或 null
	 */
	async findById(id: string): Promise<User | null> {
		const row = await this.db.table('users').where('id', '=', id).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 刪除用戶
	 *
	 * @param id - 用戶 ID
	 */
	async delete(id: string): Promise<void> {
		await this.db.table('users').where('id', '=', id).delete()
	}

	/**
	 * 查詢所有用戶（支援分頁）
	 *
	 * @param params - 查詢參數 { limit, offset }
	 * @returns User 實體陣列
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<User[]> {
		let query = this.db.table('users')
		if (params?.offset) query = query.offset(params.offset)
		if (params?.limit) query = query.limit(params.limit)
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
		const row = await this.db.table('users').where('email', '=', email).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 列出所有用戶（已棄用，使用 findAll() 代替）
	 * @deprecated 使用 findAll() 代替
	 */
	async list(): Promise<User[]> {
		return this.findAll()
	}

	// ============================================
	// 輔助方法
	// ============================================

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
