/**
 * @file IPostQueryService.ts
 * @description 文章查詢服務介面 (CQRS 讀側 Port)
 */

import type { IQuerySide } from '@/Foundation/Application/IQuerySide'
import type { PostReadModel } from '../ReadModels/PostReadModel'

/**
 * IPostQueryService 介面
 *
 * 在 DDD 架構中作為「查詢服務介面 (Query Service Interface)」。
 * 專注於資料讀取需求，通常返回 ReadModel 而非領域實體。
 */
export interface IPostQueryService extends IQuerySide<PostReadModel> {
  /**
   * 根據標題查詢文章
   *
   * @param title - 文章標題
   * @returns Promise 包含文章讀取模型或 null
   */
  findByTitle(title: string): Promise<PostReadModel | null>

  /**
   * 根據作者 ID 查詢所有文章
   *
   * @param authorId - 作者唯一識別碼
   * @returns Promise 包含文章讀取模型陣列
   */
  findByAuthor(authorId: string): Promise<PostReadModel[]>
}
