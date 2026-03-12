/**
 * @file GetPostService.ts
 * @description 查詢文章的應用服務 (Application Service)
 * @module app/Modules/Post/Application/Services
 *
 * 實現 CQRS 讀寫分離：
 * - 實現 IPostQueryService 介面
 * - 提供讀側查詢服務，返回 PostReadModel
 */

import { Title } from '../../Domain/ValueObjects/Title'
import { PostDTO } from '../DTOs/PostDTO'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'
import type { IAuthorService } from '../../Domain/Services/IAuthorService'
import type { IPostQueryService } from '../Queries/IPostQueryService'
import type { PostReadModel } from '../ReadModels/PostReadModel'

/**
 * GetPostService 類別
 *
 * 在 DDD 架構中作為「應用服務 (Application Service)」，同時實現 CQRS 讀側。
 * 負責協調查詢操作，將領域對象轉換為 ReadModel 供表現層使用。
 *
 * 職責：
 * 1. 透過 Repository 查詢文章資料
 * 2. 透過 IAuthorService Port 獲取作者資訊（跨 Bounded Context）
 * 3. 將查詢結果轉換為 ReadModel
 * 4. 處理查詢錯誤和邊界情況
 */
export class GetPostService implements IPostQueryService {
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
   * 按 ID 查詢單個文章 (IQuerySide 介面)
   *
   * @param id - 文章唯一識別碼
   * @returns Promise 包含文章 ReadModel 或 null
   */
  async findById(id: string): Promise<PostReadModel | null> {
    const post = await this.repository.findById(id)
    if (!post) {
      return null
    }
    return this.toReadModel(PostDTO.fromEntity(post))
  }

  /**
   * 查詢所有文章 (IQuerySide 介面)
   *
   * @param filters - 查詢篩選器，包含分頁參數
   * @returns Promise 包含文章 ReadModel 陣列
   */
  async findAll(filters?: { limit?: number; offset?: number }): Promise<PostReadModel[]> {
    const posts = await this.repository.findAll(filters)
    return posts.map(p => this.toReadModel(PostDTO.fromEntity(p)))
  }

  /**
   * 計算文章總數 (IQuerySide 介面)
   *
   * @returns Promise 包含文章總數
   */
  async count(): Promise<number> {
    return this.repository.count()
  }

  /**
   * 按標題查詢單個文章 (IPostQueryService 介面)
   *
   * @param title - 文章標題字串
   * @returns Promise 包含文章 ReadModel 或 null
   */
  async findByTitle(title: string): Promise<PostReadModel | null> {
    const titleVo = Title.create(title)
    const post = await this.repository.findByTitle(titleVo)
    if (!post) {
      return null
    }
    return this.toReadModel(PostDTO.fromEntity(post))
  }

  /**
   * 查詢特定作者的所有文章 (IPostQueryService 介面)
   *
   * @param authorId - 作者 ID
   * @returns Promise 包含該作者所有文章的 ReadModel 陣列
   */
  async findByAuthor(authorId: string): Promise<PostReadModel[]> {
    const posts = await this.repository.findByAuthor(authorId)
    return posts.map(p => this.toReadModel(PostDTO.fromEntity(p)))
  }

  /**
   * 列出所有文章（已棄用，使用 findAll() 代替）
   * @deprecated 使用 findAll() 代替
   * @returns Promise 包含所有文章的 DTO 陣列
   */
  async listAll(): Promise<PostDTO[]> {
    const posts = await this.repository.findAll()
    return posts.map(p => PostDTO.fromEntity(p))
  }

  /**
   * 將 PostDTO 轉換為 ReadModel
   *
   * @param dto - 文章 DTO
   * @returns PostReadModel
   * @private
   */
  private toReadModel(dto: PostDTO): PostReadModel {
    const json = dto.toJSON()
    return {
      id: json.id,
      title: json.title,
      content: json.content,
      authorId: json.authorId,
      isPublished: json.isPublished,
      isArchived: json.isArchived,
      createdAt: json.createdAt,
    }
  }
}
