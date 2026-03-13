/**
 * @file CreatePostService.ts
 * @description 建立新文章的應用服務 (Application Service)
 * @module app/Modules/Post/Application/Services
 */

import { Post } from '../../Domain/Aggregates/Post'
import { Title } from '../../Domain/ValueObjects/Title'
import { Content } from '../../Domain/ValueObjects/Content'
import { PostDTO } from '../DTOs/PostDTO'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'
import type { IAuthorService } from '../../Domain/Services/IAuthorService'
import { EntityNotFoundException, DuplicateEntityException } from '@/Shared/Domain/Exceptions'

/**
 * CreatePostService 類別
 *
 * 在 DDD 架構中作為「應用服務 (Application Service)」。
 * 負責協調領域對象 (ValueObject, Aggregate) 與基礎設施 (Repository, Port) 來完成「建立新文章」這一案例 (Use Case)。
 *
 * 職責：
 * 1. 驗證輸入資料的有效性
 * 2. 建立 Title 和 Content ValueObject（執行業務規則驗證）
 * 3. 驗證作者存在性（透過 IAuthorService Port）
 * 4. 檢查標題重複性
 * 5. 使用 Post.create() 工廠方法建立聚合根（產生領域事件）
 * 6. 將聚合根保存到倉儲（Repository 負責分派事件）
 * 7. 返回 DTO 供表現層使用
 */
export class CreatePostService {
  /**
   * 建立 CreatePostService 實例
   *
   * @param repository - 文章倉儲介面
   * @param authorService - 作者服務 Port（用於驗證 Author 存在性）
   */
  constructor(
    private repository: IPostRepository,
    private authorService: IAuthorService
  ) {}

  /**
   * 執行建立文章的用例
   *
   * @param input - 建立文章的輸入參數
   * @returns Promise 包含建立後的文章 DTO
   * @throws Error 如果標題或內容無效、作者不存在、標題已被使用
   */
  async execute(input: {
    id: string
    title: string
    content?: string
    authorId: string
  }): Promise<PostDTO> {
    // 1. 建立 ValueObject（執行業務規則驗證）
    const title = Title.create(input.title)
    const content = Content.create(input.content)

    // 2. 驗證作者存在性
    const author = await this.authorService.findAuthor(input.authorId)
    if (!author) {
      throw new EntityNotFoundException('Author', input.authorId)
    }

    // 3. 檢查標題是否已被使用
    const existingPost = await this.repository.findByTitle(title)
    if (existingPost) {
      throw new DuplicateEntityException('Post', 'title', title.value)
    }

    // 4. 建立聚合根（產生 PostCreated 事件）
    const post = Post.create(input.id, title, content, input.authorId)

    // 5. 保存到倉儲（Repository 負責分派事件）
    await this.repository.save(post)

    // 6. 轉換為 DTO 供表現層使用
    return PostDTO.fromEntity(post)
  }
}
