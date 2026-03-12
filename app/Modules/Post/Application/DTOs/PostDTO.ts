/**
 * @file PostDTO.ts
 * @description 文章資料傳輸物件 (Data Transfer Object)
 *
 * 在 DDD 架構中的角色：
 * - 應用層 (Application Layer)：作為 Presentation 層與 Application 層之間交換資料的契約。
 * - 職責：封裝從領域聚合根轉換而來的資料，確保不會將領域邏輯洩露到外部。
 *
 * Phase 3 改造：
 * - 從領域聚合根提取 ValueObject 的原始值
 * - 支持靜態工廠方法 fromEntity()
 */

import { Post } from '../../Domain/Aggregates/Post'

/**
 * 文章資料傳輸物件介面
 */
export interface PostJSONData {
  /** 文章唯一識別符 */
  id: string
  /** 文章標題 */
  title: string
  /** 文章內容 */
  content: string
  /** 作者識別碼 */
  authorId: string
  /** 是否已發佈 */
  isPublished: boolean
  /** 是否已存檔 */
  isArchived: boolean
  /** 建立時間 (ISO 格式字串) */
  createdAt: string
}

/**
 * PostDTO 類別
 *
 * 在 DDD 架構中作為「資料傳輸物件 (DTO)」。
 * 負責在應用層與表現層之間傳遞文章資料，並提供與領域聚合根之間的轉換方法。
 */
export class PostDTO {
  /** 文章唯一識別符 */
  id: string = ''
  /** 文章標題 */
  title: string = ''
  /** 文章內容 */
  content: string = ''
  /** 作者識別碼 */
  authorId: string = ''
  /** 是否已發佈 */
  isPublished: boolean = false
  /** 是否已存檔 */
  isArchived: boolean = false
  /** 建立時間 */
  createdAt: Date = new Date()

  /**
   * 從領域聚合根轉換為 DTO
   *
   * @param entity - 文章領域聚合根
   * @returns 新的 PostDTO 實例
   */
  static fromEntity(entity: Post): PostDTO {
    const dto = new PostDTO()
    dto.id = entity.id
    dto.title = entity.title.value
    dto.content = entity.content.value
    dto.authorId = entity.authorId
    dto.isPublished = entity.isPublished
    dto.isArchived = entity.isArchived
    dto.createdAt = entity.createdAt
    return dto
  }

  /**
   * 將 DTO 轉換為純 JSON 物件格式 (用於 HTTP 響應)
   *
   * @returns 符合 PostJSONData 介面的物件
   */
  toJSON(): PostJSONData {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      authorId: this.authorId,
      isPublished: this.isPublished,
      isArchived: this.isArchived,
      createdAt: this.createdAt.toISOString(),
    }
  }
}
