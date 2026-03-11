/**
 * Post 資料倉儲實現 (ORM 無關)
 *
 * @internal - 此實現是基礎設施層細節，應通過 IPostRepository 使用
 *
 * 設計：
 * - 依賴 IDatabaseAccess（由上層注入；無 DB 時上層注入 MemoryDatabaseAccess）
 * - 實現 IPostRepository 介面，隱藏所有 ORM 細節
 * - 不知道底層是真實 DB 或內存（完全透過 IDatabaseAccess 抽象）
 *
 * 架構優勢：
 * ✅ 單一 Repository 實現，無 if (db) 分支
 * ✅ 內存/數據庫由上層處理，底層僅依賴 Port
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
	constructor(private readonly db: IDatabaseAccess) {}

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
		if (params?.offset) query = query.offset(params.offset)
		if (params?.limit) query = query.limit(params.limit)
		const rows = await query.select()
		return rows.map((row) => this.toDomain(row))
	}

	/**
	 * 計算 Post 總數
	 *
	 * @returns Post 總數
	 */
	async count(): Promise<number> {
		return this.db.table('posts').count()
	}

	// ============================================
	// 私有轉換方法（隱藏資料層細節）
	// ============================================

	/**
	 * 將資料庫行轉換為 Domain Entity
	 * @private
	 */
	private toDomain(row: Record<string, unknown>): Post {
		return {
			id: row.id as string,
			title: row.title as string,
			content: row.content as string,
			created_at: row.created_at as string,
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
