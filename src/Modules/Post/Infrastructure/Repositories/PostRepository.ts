/**
 * Post 資料倉儲實現 (Atlas ORM)
 *
 * @internal - 此實現是基礎設施層細節，應通過 IPostRepository 使用
 *
 * 實現了 IPostRepository 介面，隱藏所有 ORM 細節。
 * 使用 IDatabaseAccess 進行所有資料庫操作，確保 ORM 無關性。
 *
 * @design
 * - 構造函數只依賴 IDatabaseAccess（公開介面）
 * - 提供 toDomain() 和 toRow() 轉換方法隱藏資料層細節
 * - 所有資料庫操作使用 IDatabaseAccess，不使用原生 ORM API
 *
 * @see docs/REPOSITORY_ABSTRACTION_TEMPLATE.md - Repository 最佳實踐
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'

// 暫時使用 any，應該替換為 Post Entity 實型
interface Post {
	id: string
	title: string
	content: string
	created_at: string
}

export class PostRepository implements IPostRepository {
	/**
	 * 構造函數只依賴 IDatabaseAccess（ORM 無關介面）
	 */
	constructor(private db: IDatabaseAccess) {}

	// ============================================
	// 基礎 CRUD 操作（實現 IRepository<Post>）
	// ============================================

	/**
	 * 保存 Post（新增或更新）
	 *
	 * @param entity - Post 實體
	 */
	async save(entity: any): Promise<void> {
		const row = this.toRow(entity)
		const exists = await this.findById(entity.id)

		if (exists) {
			await this.db.table('posts').where('id', '=', entity.id).update(row)
		} else {
			await this.db.table('posts').insert(row)
		}
	}

	/**
	 * 根據 ID 查詢 Post
	 *
	 * @param id - Post ID
	 * @returns Post 實體或 null
	 */
	async findById(id: string): Promise<any | null> {
		const row = await this.db.table('posts').where('id', '=', id).first()

		return row ? this.toDomain(row) : null
	}

	/**
	 * 刪除 Post
	 *
	 * @param id - Post ID
	 */
	async delete(id: string): Promise<void> {
		await this.db.table('posts').where('id', '=', id).delete()
	}

	/**
	 * 查詢所有 Post（支援分頁）
	 *
	 * @param params - 查詢參數 { limit, offset }
	 * @returns Post 實體陣列
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<any[]> {
		let query = this.db.table('posts')

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
	 * 計算 Post 總數
	 *
	 * @param _params - 過濾條件（當前未使用）
	 * @returns Post 總數
	 */
	async count(_params?: { [key: string]: any }): Promise<number> {
		return this.db.table('posts').count()
	}

	// ============================================
	// 私有轉換方法（隱藏資料層細節）
	// ============================================

	/**
	 * 將資料庫行轉換為 Domain Entity
	 * @private
	 */
	private toDomain(row: Record<string, unknown>): any {
		return {
			id: row.id,
			title: row.title,
			content: row.content,
			created_at: row.created_at,
		}
	}

	/**
	 * 將 Domain Entity 轉換為資料庫行
	 * @private
	 */
	private toRow(post: any): Record<string, unknown> {
		return {
			id: post.id,
			title: post.title,
			content: post.content,
			created_at: post.created_at ?? new Date().toISOString(),
		}
	}
}
