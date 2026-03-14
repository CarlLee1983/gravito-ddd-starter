/**
 * @file IPostRepository.ts
 * @description 定義 Post 模組的資料倉儲介面 (Repository Interface)
 * @module src/Modules/Post/Domain/Repositories
 *
 * Phase 3 改造：
 * - findByTitle 接受 Title ValueObject 而非原始字串
 * - 完整支持 ValueObject 驅動的查詢
 */

import type { IRepository } from '@/Foundation/Domain/IRepository'
import { Post } from '../Aggregates/Post'
import type { Title } from '../ValueObjects/Title'

/**
 * IPostRepository 介面
 *
 * 在 DDD 架構中屬於「領域層 (Domain Layer)」。
 * 定義了對 Post 聚合根進行持久化操作的契約。
 *
 * 依照依賴反轉原則 (DIP)：
 * - 領域層定義介面 (Port)。
 * - 基礎設施層實現該介面 (Adapter)。
 *
 * 這使得領域邏輯可以獨立於具體的資料庫技術 (如 Atlas, Drizzle, Memory 等)。
 */
export interface IPostRepository extends IRepository<Post> {
  // 基礎 CRUD 操作由 IRepository 提供：
  // - save(entity: Post): Promise<void>
  // - findById(id: string): Promise<Post | null>
  // - delete(id: string): Promise<void>
  // - findAll(params?): Promise<Post[]>
  // - count(params?): Promise<number>

  /**
   * 根據標題查找文章
   * @param title - Title ValueObject
   * @returns 找到的 Post 聚合根或 null
   */
  findByTitle(title: Title): Promise<Post | null>

  /**
   * 獲取特定作者的所有文章
   * @param authorId - 作者 ID
   * @returns 該作者的文章列表
   */
  findByAuthor(authorId: string): Promise<Post[]>
}
