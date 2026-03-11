/**
 * @file PostRepository.ts
 * @description 實現 Post 模組的資料倉儲 (Repository)
 * @module src/Modules/Post/Infrastructure/Repositories
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'
import { Post } from '../../Domain/Aggregates/Post'

/**
 * PostRepository 類別
 * 
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」，實現了領域層定義的 IPostRepository 介面。
 * 負責將領域物件 (Domain Entity/Aggregate) 轉換為資料層可理解的格式並進行持久化操作。
 */
export class PostRepository implements IPostRepository {
	/**
	 * 建立 PostRepository 實例
	 * 
	 * @param db - 資料庫存取介面實例 (Port)，隱藏了具體的 ORM 實現。
	 */
	constructor(private readonly db: IDatabaseAccess) {}

	// ============================================
	// 基礎 CRUD 操作（實現 IRepository<Post>）
	// ============================================

	/**
	 * 保存文章實體 (新增或更新)
	 * 
	 * 根據實體 ID 是否存在來決定執行插入 (insert) 或更新 (update) 操作。
	 * 
	 * @param entity - 要保存的文章實體
	 * @returns Promise<void>
	 */
	async save(entity: Post): Promise<void> {
		const row = this.toRow(entity)
		const exists = await this.findById(entity.id)
		if (exists) {
			await this.db.table('posts').where('id', '=', entity.id).update(row)
		} else {
			await this.db.table('posts').insert(row)
		}
	}

	/**
	 * 根據 ID 查詢文章
	 * 
	 * @param id - 文章唯一識別符
	 * @returns Promise 包含文章實體或 null (若找不到)
	 */
	async findById(id: string): Promise<Post | null> {
		const row = await this.db.table('posts').where('id', '=', id).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 根據 ID 刪除文章
	 * 
	 * @param id - 文章唯一識別符
	 * @returns Promise<void>
	 */
	async delete(id: string): Promise<void> {
		await this.db.table('posts').where('id', '=', id).delete()
	}

	/**
	 * 查詢所有文章 (支援分頁)
	 * 
	 * @param params - 查詢參數，包含 limit (每頁筆數) 與 offset (偏移量)
	 * @returns Promise 包含文章實體陣列
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<Post[]> {
		let query = this.db.table('posts')
		if (params?.offset) query = query.offset(params.offset)
		if (params?.limit) query = query.limit(params.limit)
		const rows = await query.select()
		return rows.map((row) => this.toDomain(row))
	}

	/**
	 * 計算文章總筆數
	 * 
	 * @returns Promise 包含文章總筆數
	 */
	async count(): Promise<number> {
		return this.db.table('posts').count()
	}

	// ============================================
	// 業務相關方法（實現 IPostRepository）
	// ============================================

	/**
	 * 根據標題查找文章
	 * 
	 * @param title - 文章標題
	 * @returns 找到的 Post 聚合根或 null
	 */
	async findByTitle(title: string): Promise<Post | null> {
		const row = await this.db.table('posts').where('title', '=', title).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 獲取特定作者的所有文章
	 * 
	 * @param authorId - 作者 ID
	 * @returns 該作者的文章列表
	 */
	async findByAuthor(authorId: string): Promise<Post[]> {
		const rows = await this.db.table('posts').where('user_id', '=', authorId).select()
		return rows.map((row) => this.toDomain(row))
	}

	// ============================================
	// 私有轉換方法（隱藏資料層細節）
	// ============================================

	/**
	 * 將資料庫行轉換為 Domain Entity
	 * 
	 * @param row - 資料庫中的原始資料行
	 * @returns Domain Entity 格式的資料
	 * @private
	 */
	private toDomain(row: Record<string, unknown>): Post {
		return Post.fromDatabase({
			id: row.id as string,
			title: row.title as string,
			content: row.content as string,
			user_id: row.user_id as string,
			created_at: row.created_at as string,
		})
	}

	/**
	 * 將 Domain Entity 轉換為資料庫行格式
	 * 
	 * @param post - Domain Entity 實體
	 * @returns 符合資料庫結構的資料行對象
	 * @private
	 */
	private toRow(post: Post): Record<string, unknown> {
		return {
			id: post.id,
			title: post.title,
			content: post.content,
			user_id: post.userId,
			created_at: post.createdAt.toISOString(),
		}
	}
}
