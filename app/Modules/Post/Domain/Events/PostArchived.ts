/**
 * @file PostArchived.ts
 * @description 文章存檔事件
 *
 * 在 DDD 中代表「文章被存檔並禁止進一步編輯」的業務事件。
 * 由 Post.archive() 發佈，Repository 層分派。
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 文章存檔領域事件
 *
 * 表示文章已被存檔的不可逆事實。
 * 存檔後的文章無法再編輯、發佈或更改。
 * 用於 Event Sourcing 重建文章狀態，以及跨 Bounded Context 通知（歸檔系統等）。
 */
export class PostArchived extends DomainEvent {
  /**
   * 建立 PostArchived 事件
   *
   * @param postId - 被存檔的文章 ID
   * @param authorId - 文章作者 ID
   * @param occurredAt - 事件發生時間（預設為現在）
   */
  constructor(
    public readonly postId: string,
    public readonly authorId: string,
    occurredAt: Date = new Date(),
  ) {
    super(postId, 'PostArchived', { authorId }, 1, occurredAt)
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
