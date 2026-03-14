/**
 * @file PostTitleChanged.ts
 * @description 文章標題變更事件
 *
 * 在 DDD 中代表「文章標題被修改」的業務事件。
 * 由 Post.changeTitle() 發佈，Repository 層分派。
 * 不允許已存檔的文章變更標題。
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 文章標題變更領域事件
 *
 * 表示文章標題已被修改的不可逆事實。
 * 用於 Event Sourcing 重建文章狀態，以及跨 Bounded Context 通知（SEO 系統、搜尋引擎等）。
 */
export class PostTitleChanged extends DomainEvent {
  /**
   * 建立 PostTitleChanged 事件
   *
   * @param postId - 被修改的文章 ID
   * @param oldTitle - 舊標題
   * @param newTitle - 新標題
   * @param occurredAt - 事件發生時間（預設為現在）
   */
  constructor(
    public readonly postId: string,
    public readonly oldTitle: string,
    public readonly newTitle: string,
    occurredAt: Date = new Date(),
  ) {
    super(postId, 'PostTitleChanged', { oldTitle, newTitle }, 1, occurredAt)
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
        oldTitle: this.oldTitle,
        newTitle: this.newTitle,
      },
    }
  }
}
