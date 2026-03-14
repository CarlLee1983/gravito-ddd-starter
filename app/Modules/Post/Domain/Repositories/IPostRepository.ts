/**
 * @file IPostRepository.ts
 * @description 定義 Post 模組的資料倉儲介面 (Repository Interface)，負責 Post 聚合根的持久化操作
 */

import type { IRepository } from '@/Foundation/Domain/IRepository'
import { Post } from '../Aggregates/Post'
import type { Title } from '../ValueObjects/Title'

/**
 * IPostRepository 介面
 * 在 DDD 架構中屬於領域層，定義對 Post 聚合根進行持久化操作的契約。
 */
export interface IPostRepository extends IRepository<Post> {
  /**
   * 根據標題查找文章
   * @param title Title ValueObject
   * @returns 找到的 Post 聚合根或 null
   * @throws 可能因資料庫查詢錯誤而拋出異常
   */
  findByTitle(title: Title): Promise<Post | null>

  /**
   * 獲取特定作者的所有文章
   * @param authorId 作者唯一識別碼
   * @returns 該作者的文章列表
   * @throws 可能因資料庫查詢錯誤而拋出異常
   */
  findByAuthor(authorId: string): Promise<Post[]>
}
