/**
 * @file GetPostService.ts
 * @description 查詢文章的應用服務 (Application Service)
 * @module app/Modules/Post/Application/Services
 */

import { Title } from '../../Domain/ValueObjects/Title'
import { PostDTO } from '../DTOs/PostDTO'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'
import type { IAuthorService } from '../../Domain/Services/IAuthorService'

/**
 * GetPostService 類別
 *
 * 在 DDD 架構中作為「應用服務 (Application Service)」。
 * 負責協調查詢操作，將領域對象轉換為 DTO 供表現層使用。
 *
 * 職責：
 * 1. 透過 Repository 查詢文章資料
 * 2. 透過 IAuthorService Port 獲取作者資訊（跨 Bounded Context）
 * 3. 將查詢結果轉換為 DTO
 * 4. 處理查詢錯誤和邊界情況
 */
export class GetPostService {
  /**
   * 建立 GetPostService 實例
   *
   * @param repository - 文章倉儲介面
   * @param authorService - 作者服務 Port（用於獲取作者資訊）
   */
  constructor(
    private repository: IPostRepository,
    private authorService: IAuthorService
  ) {}

  /**
   * 按 ID 查詢單個文章
   *
   * @param id - 文章唯一識別碼
   * @returns Promise 包含文章 DTO 或 null
   */
  async findById(id: string): Promise<PostDTO | null> {
    const post = await this.repository.findById(id)
    if (!post) {
      return null
    }
    return PostDTO.fromEntity(post)
  }

  /**
   * 按標題查詢單個文章
   *
   * @param title - 文章標題字串
   * @returns Promise 包含文章 DTO 或 null
   */
  async findByTitle(title: string): Promise<PostDTO | null> {
    const titleVo = Title.create(title)
    const post = await this.repository.findByTitle(titleVo)
    if (!post) {
      return null
    }
    return PostDTO.fromEntity(post)
  }

  /**
   * 列出所有文章
   *
   * @returns Promise 包含所有文章的 DTO 陣列
   */
  async listAll(): Promise<PostDTO[]> {
    const posts = await this.repository.findAll()
    return posts.map(p => PostDTO.fromEntity(p))
  }
}
