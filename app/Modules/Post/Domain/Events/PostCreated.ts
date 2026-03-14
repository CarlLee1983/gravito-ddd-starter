/**
 * @file PostCreated.ts
 * @description 當新文章被建立時觸發的領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 文章已建立事件
 *
 * 在 DDD 架構中作為「領域事件 (Domain Event)」。
 * 用於通知其他模組或訂閱者有新文章被建立。
 */
export class PostCreated extends DomainEvent {
  /**
   * 建立事件實例
   *
   * @param postId - 文章唯一識別碼
   * @param title - 文章標題
   * @param content - 文章內容
   * @param authorId - 作者唯一識別碼
   * @param createdAt - 建立時間
   */
  constructor(
    public readonly postId: string,
    public readonly title: string,
    public readonly content: string,
    public readonly authorId: string,
    public readonly createdAt: Date
  ) {
    super(postId, 'PostCreated', { title, content, authorId, createdAt: createdAt.toISOString() })
  }

  /**
   * 序列化為 JSON
   *
   * 用於事件序列化、存儲或在系統間傳輸。
   * 只包含基本類型（string、number、boolean、null），不包含 Date 或 Class 物件。
   * 統一格式：eventId, aggregateId, eventType, occurredAt, version, data
   *
   * @returns 包含事件資料的 JSON 物件
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.postId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: {
        title: this.title,
        content: this.content,
        authorId: this.authorId,
        createdAt: this.createdAt.toISOString(),
      },
    }
  }
}
