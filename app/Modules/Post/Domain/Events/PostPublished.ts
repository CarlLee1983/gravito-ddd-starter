/**
 * @file PostPublished.ts
 * @description 文章發佈事件
 *
 * 在 DDD 中代表「文章被發佈並變為公開可見」的業務事件。
 * 由 Post.publish() 發佈，Repository 層分派。
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 文章發佈領域事件
 *
 * 表示文章已發佈的不可逆事實。
 * 用於 Event Sourcing 重建文章狀態，以及跨 Bounded Context 通知（推薦系統、RSS 等）。
 */
export class PostPublished extends DomainEvent {
  /**
   * 建立 PostPublished 事件
   *
   * @param postId - 被發佈的文章 ID
   * @param authorId - 文章作者 ID
   * @param occurredAt - 事件發生時間（預設為現在）
   */
  constructor(
    public readonly postId: string,
    public readonly authorId: string,
    occurredAt: Date = new Date(),
  ) {
    super(postId, 'PostPublished', { authorId }, 1, occurredAt)
  }

  /**
   * 序列化事件為 JSON
   *
   * @returns 事件的 JSON 表示
   */
  toJSON() {
    return {
      eventId: this.eventId,
      aggregateId: this.postId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: {
        postId: this.postId,
        authorId: this.authorId,
      },
    }
  }
}
