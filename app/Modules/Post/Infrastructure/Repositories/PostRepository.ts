/**
 * @file PostRepository.ts
 * @description 實現 Post 模組的資料倉儲 (Repository)
 *
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」，實現了領域層定義的 IPostRepository 介面。
 * 負責將領域物件 (Domain Entity/Aggregate) 轉換為資料層可理解的格式並進行持久化操作。
 *
 * Phase 3 改造：
 * - 使用 Post.reconstitute() 而非 fromDatabase()
 * - 提取 ValueObject 值進行持久化
 * - 完整事件分派機制
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/IEventDispatcher'
import { Post } from '../../Domain/Aggregates/Post'
import { Title } from '../../Domain/ValueObjects/Title'
import { Content } from '../../Domain/ValueObjects/Content'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'

/**
 * PostRepository 類別
 *
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」。
 * 責負將領域聚合根與資料庫之間的轉換與操作。
 */
export class PostRepository implements IPostRepository {
  /**
   * 建立 PostRepository 實例
   *
   * @param db - 資料庫存取介面實例 (Port)
   * @param eventDispatcher - 領域事件分發器實例（可選）
   */
  constructor(
    private readonly db: IDatabaseAccess,
    private readonly eventDispatcher?: IEventDispatcher
  ) {}

  // ============================================
  // 基礎 CRUD 操作（實現 IRepository<Post>）
  // ============================================

  /**
   * 保存文章聚合根 (新增或更新)
   *
   * **Repository 責任**：
   * 1. 在儲存時，標記聚合的事件為已提交（因為內存不需持久化層）
   * 2. 若有 EventDispatcher，應分派未提交的事件
   *
   * @param entity - 文章聚合根（包含未提交事件）
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

    // ✨ 若注入了分發器，則分發積壓的領域事件
    if (this.eventDispatcher) {
      await this.eventDispatcher.dispatch([...entity.getUncommittedEvents()])
      entity.markEventsAsCommitted()
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
   * @param params - 查詢參數，包含 limit 與 offset
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
   * @param title - Title ValueObject
   * @returns 找到的 Post 聚合根或 null
   */
  async findByTitle(title: Title): Promise<Post | null> {
    const row = await this.db.table('posts').where('title', '=', title.value).first()
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
   * 將資料庫行轉換為 Domain Object
   *
   * @param row - 資料庫中的原始資料行
   * @returns 轉換後的領域聚合根
   * @private
   */
  private toDomain(row: any): Post {
    const title = Title.create(row.title as string)
    const content = Content.create(row.content as string)
    const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string)

    return Post.reconstitute(row.id as string, title, content, row.user_id as string, createdAt)
  }

  /**
   * 將 Domain Object 轉換為資料庫行格式
   *
   * @param post - Domain Entity 聚合根
   * @returns 符合資料庫結構的資料行對象
   * @private
   */
  private toRow(post: Post): Record<string, unknown> {
    return {
      id: post.id,
      title: post.title.value,
      content: post.content.value,
      user_id: post.authorId,
      created_at: post.createdAt.toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}
