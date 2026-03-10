/**
 * Post 資料倉儲實現 (ORM 無關)
 *
 * @internal - 此實現是基礎設施層細節，應通過 IPostRepository 使用
 *
 * 設計：
 * - 接收可選的 IDatabaseAccess，若提供則使用資料庫，否則使用內存
 * - 實現了 IPostRepository 介面，隱藏所有 ORM 細節
 * - 使用 IDatabaseAccess 進行所有資料庫操作，確保 ORM 無關性
 *
 * 架構優勢：
 * ✅ 只有一個 Repository 實現（無 DrizzlePostRepository 等）
 * ✅ 透過 IDatabaseAccess 支援任何 ORM
 * ✅ 內存和數據庫模式共用同一個代碼
 * ✅ 完全對 ORM 選擇透明
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
	// 內存存儲（當 IDatabaseAccess 不提供時使用）
	private memoryPosts: Map<string, Post> = new Map()
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
	// 基礎 CRUD 操作（實現 IRepository<Post>）
	// ============================================

	/**
	 * 保存 Post（新增或更新）
	 *
	 * @param entity - Post 實體
	 */
	async save(entity: any): Promise<void> {
		if (this.db) {
			// 數據庫模式
			const row = this.toRow(entity)
			const exists = await this.findById(entity.id)

			if (exists) {
				await this.db.table('posts').where('id', '=', entity.id).update(row)
			} else {
				await this.db.table('posts').insert(row)
			}
		} else {
			// 內存模式
			this.memoryPosts.set(entity.id, entity)
		}
	}

	/**
	 * 根據 ID 查詢 Post
	 *
	 * @param id - Post ID
	 * @returns Post 實體或 null
	 */
	async findById(id: string): Promise<any | null> {
		if (this.db) {
			// 數據庫模式
			const row = await this.db.table('posts').where('id', '=', id).first()
			return row ? this.toDomain(row) : null
		} else {
			// 內存模式
			return this.memoryPosts.get(id) || null
		}
	}

	/**
	 * 刪除 Post
	 *
	 * @param id - Post ID
	 */
	async delete(id: string): Promise<void> {
		if (this.db) {
			// 數據庫模式
			await this.db.table('posts').where('id', '=', id).delete()
		} else {
			// 內存模式
			this.memoryPosts.delete(id)
		}
	}

	/**
	 * 查詢所有 Post（支援分頁）
	 *
	 * @param params - 查詢參數 { limit, offset }
	 * @returns Post 實體陣列
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<any[]> {
		if (this.db) {
			// 數據庫模式
			let query = this.db.table('posts')

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
			let posts = Array.from(this.memoryPosts.values())

			// 應用分頁
			if (params?.offset) {
				posts = posts.slice(params.offset)
			}
			if (params?.limit) {
				posts = posts.slice(0, params.limit)
			}

			return posts
		}
	}

	/**
	 * 計算 Post 總數
	 *
	 * @returns Post 總數
	 */
	async count(): Promise<number> {
		if (this.db) {
			// 數據庫模式
			return this.db.table('posts').count()
		} else {
			// 內存模式
			return this.memoryPosts.size
		}
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
