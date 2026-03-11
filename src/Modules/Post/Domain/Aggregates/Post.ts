/**
 * @file Post.ts
 * @description 定義 Post 模組的聚合根 (Aggregate Root)
 * @module src/Modules/Post/Domain/Aggregates
 */

/**
 * PostProps 介面
 * 
 * 定義 Post 聚合根所需的屬性結構。
 */
export interface PostProps {
  /** 文章唯一識別符 */
  id: string
  /** 文章標題 */
  title: string
  /** 文章內容 (選填) */
  content?: string
  /** 作者唯一識別符 */
  userId: string
  /** 建立時間 */
  createdAt: Date
}

import { BaseEntity } from '@/Shared/Domain/BaseEntity'

/**
 * Post 類別
 * 
 * 在 DDD 架構中作為「聚合根 (Aggregate Root)」。
 * 代表系統中的一篇文章，封裝了文章的狀態與業務規則。
 */
export class Post extends BaseEntity {
  /**
   * 私有建構函數，強制使用靜態工廠方法建立實例。
   * 
   * @param props - 文章屬性
   */
  private constructor(private props: PostProps) {
    super(props.id)
    // 確保 BaseEntity 的日期與屬性同步
    if (props.createdAt) {
      // 由於 BaseEntity 的 createdAt 是 protected，我們在子類中存取或透過 props 管理
    }
  }

  /**
   * 建立新的 Post 實例 (領域邏輯)
   * 
   * @param id - 文章 ID
   * @param title - 標題
   * @param userId - 作者 ID
   * @param content - 內容 (選填)
   * @returns 新的 Post 聚合根實例
   */
  static create(id: string, title: string, userId: string, content?: string): Post {
    return new Post({
      id,
      title,
      content,
      userId,
      createdAt: new Date(),
    })
  }

  /**
   * 從資料庫原始資料重建 Post 實體 (基礎設施邏輯)
   * 
   * @param data - 資料庫原始資料
   * @returns 重建後的 Post 聚合根實例
   */
  static fromDatabase(data: {
    id: string
    title: string
    content?: string
    user_id: string
    created_at?: string | Date
  }): Post {
    return new Post({
      id: data.id,
      title: data.title,
      content: data.content,
      userId: data.user_id,
      createdAt: data.created_at instanceof Date ? data.created_at : new Date(data.created_at || new Date()),
    })
  }

  /** 取得文章 ID */
  get id(): string {
    return this.props.id
  }

  /** 取得文章標題 */
  get title(): string {
    return this.props.title
  }

  /** 取得文章內容 */
  get content(): string | undefined {
    return this.props.content
  }

  /** 取得作者 ID */
  get userId(): string {
    return this.props.userId
  }

  /** 取得建立時間 */
  get createdAt(): Date {
    return this.props.createdAt
  }
}
