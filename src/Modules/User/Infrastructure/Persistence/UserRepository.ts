/**
 * 用戶資料倉儲實現 (ORM 無關)
 *
 * @internal - 此實現是基礎設施層細節，應通過 IUserRepository 使用
 *
 * 設計：
 * - 接收可選的 IDatabaseAccess，若提供則使用資料庫，否則使用內存
 * - 完全實現 IRepository<User> 契約
 * - 支援基本 CRUD 操作
 * - 支援業務相關查詢（findByEmail）
 * - 不知道底層使用的是哪個 ORM（完全透過 IDatabaseAccess 抽象）
 *
 * 架構優勢：
 * ✅ 只有一個 Repository 實現（無 DrizzleUserRepository 等）
 * ✅ 透過 IDatabaseAccess 支援任何 ORM
 * ✅ 內存和數據庫模式共用同一個代碼
 * ✅ 完全對 ORM 選擇透明
 *
 * @see docs/REPOSITORY_ABSTRACTION_TEMPLATE.md - Repository 最佳實踐
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { User } from '../../Domain/Aggregates/User'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

export class UserRepository implements IUserRepository {
	// 內存存儲（當 IDatabaseAccess 不提供時使用）
	private memoryUsers: Map<string, User> = new Map()
	// 數據庫存儲（可選）
	private db: IDatabaseAccess | undefined

	/**
	 * @param db 可選的數據庫存取接口
	 *           - 若提供：使用真實數據庫（Drizzle/Prisma/Atlas）
	 *           - 若不提供：使用內存存儲（開發/測試）
	 */
	constructor(db?: IDatabaseAccess) {
		this.db = db
	}

	// ============================================
	// 基礎 CRUD 操作（實現 IRepository<User>）
	// ============================================

	/**
	 * 保存用戶（新增或更新）
	 *
	 * @param user - User 實體
	 */
	async save(user: User): Promise<void> {
		if (this.db) {
			// 數據庫模式
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
		} else {
			// 內存模式
			this.memoryUsers.set(user.id, user)
		}
	}

	/**
	 * 根據 ID 查詢用戶
	 *
	 * @param id - 用戶 ID
	 * @returns User 實體或 null
	 */
	async findById(id: string): Promise<User | null> {
		if (this.db) {
			// 數據庫模式
			const row = await this.db.table('users').where('id', '=', id).first()
			return row ? this.toDomain(row) : null
		} else {
			// 內存模式
			return this.memoryUsers.get(id) || null
		}
	}

	/**
	 * 刪除用戶
	 *
	 * @param id - 用戶 ID
	 */
	async delete(id: string): Promise<void> {
		if (this.db) {
			// 數據庫模式
			await this.db.table('users').where('id', '=', id).delete()
		} else {
			// 內存模式
			this.memoryUsers.delete(id)
		}
	}

	/**
	 * 查詢所有用戶（支援分頁）
	 *
	 * @param params - 查詢參數 { limit, offset }
	 * @returns User 實體陣列
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<User[]> {
		if (this.db) {
			// 數據庫模式
			let query = this.db.table('users')

			if (params?.offset) {
				query = query.offset(params.offset)
			}

			if (params?.limit) {
				query = query.limit(params.limit)
			}

			const rows = await query.select()
			return rows.map((row) => this.toDomain(row))
		} else {
			// 內存模式
			let users = Array.from(this.memoryUsers.values())

			// 應用分頁
			if (params?.offset) {
				users = users.slice(params.offset)
			}
			if (params?.limit) {
				users = users.slice(0, params.limit)
			}

			return users
		}
	}

	/**
	 * 計算用戶總數
	 *
	 * @returns 用戶總數
	 */
	async count(): Promise<number> {
		if (this.db) {
			// 數據庫模式
			return this.db.table('users').count()
		} else {
			// 內存模式
			return this.memoryUsers.size
		}
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
		if (this.db) {
			// 數據庫模式
			const row = await this.db
				.table('users')
				.where('email', '=', email)
				.first()

			return row ? this.toDomain(row) : null
		} else {
			// 內存模式
			for (const user of this.memoryUsers.values()) {
				if (user.email === email) {
					return user
				}
			}
			return null
		}
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
