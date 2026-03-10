/**
 * Drizzle Post Repository 實現
 *
 * 使用 Drizzle ORM 的 Post Repository 實現
 * 完全實現 IPostRepository 介面，與 IDatabaseAccess 無關
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IPostRepository } from '@/Modules/Post/Domain/Repositories/IPostRepository'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'

/**
 * Drizzle Post Repository 實現
 *
 * 提供使用 Drizzle ORM 的文章資料訪問
 */
export class DrizzlePostRepository implements IPostRepository {
  constructor(private db: IDatabaseAccess) {}

  /**
   * 根據 ID 查詢文章
   *
   * @param id 文章 ID
   * @returns Post 實體或 null
   */
  async findById(id: string): Promise<Post | null> {
    const row = await this.db.table('posts').where('id', '=', id).first()

    if (!row) {
      return null
    }

    return this.toDomain(row)
  }

  /**
   * 根據使用者 ID 查詢所有文章
   *
   * @param userId 使用者 ID
   * @param params 查詢參數 { limit, offset }
   * @returns Post 實體陣列
   */
  async findByUserId(
    userId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<Post[]> {
    let query = this.db.table('posts').where('user_id', '=', userId)

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
   * 查詢所有文章（支援分頁）
   *
   * @param params 查詢參數 { limit, offset }
   * @returns Post 實體陣列
   */
  async findAll(params?: { limit?: number; offset?: number }): Promise<Post[]> {
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
   * 計算文章總數
   *
   * @returns 文章總數
   */
  async count(): Promise<number> {
    return this.db.table('posts').count()
  }

  /**
   * 保存文章（新增或更新）
   *
   * @param post Post 實體
   */
  async save(post: Post): Promise<void> {
    const row = this.toRow(post)

    // 先嘗試查詢，決定是 insert 還是 update
    const existing = await this.db
      .table('posts')
      .where('id', '=', post.id)
      .first()

    if (existing) {
      await this.db
        .table('posts')
        .where('id', '=', post.id)
        .update(row)
    } else {
      await this.db.table('posts').insert(row)
    }
  }

  /**
   * 刪除文章
   *
   * @param id 文章 ID
   */
  async delete(id: string): Promise<void> {
    await this.db.table('posts').where('id', '=', id).delete()
  }

  /**
   * 將資料庫記錄轉換為 Domain 實體
   *
   * @private
   */
  private toDomain(row: any): Post {
    return Post.fromDatabase({
      id: row.id as string,
      title: row.title as string,
      content: row.content as string | undefined,
      user_id: row.user_id as string,
      created_at: row.created_at as string | Date,
    })
  }

  /**
   * 將 Domain 實體轉換為資料庫記錄
   *
   * @private
   */
  private toRow(post: Post): Record<string, unknown> {
    return {
      id: post.id,
      title: post.title,
      content: post.content || null,
      user_id: post.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}
