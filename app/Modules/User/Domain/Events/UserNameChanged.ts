/**
 * @file UserNameChanged.ts
 * @description 用戶名稱變更事件
 *
 * 在 DDD 中代表「用戶決定變更其名稱」的業務事件。
 * 由 User.changeName() 發佈，Repository 層分派。
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 用戶名稱變更領域事件
 *
 * 表示用戶名稱已被修改的不可逆事實。
 * 用於 Event Sourcing 重建用戶狀態，以及跨 Bounded Context 通知。
 */
export class UserNameChanged extends DomainEvent {
  /**
   * 建立 UserNameChanged 事件
   *
   * @param userId - 變更名稱的用戶 ID
   * @param newName - 新的用戶名稱
   * @param occurredAt - 事件發生時間（預設為現在）
   */
  constructor(
    public readonly userId: string,
    public readonly newName: string,
    occurredAt: Date = new Date(),
  ) {
    super(userId, 'UserNameChanged', { newName }, 1, occurredAt)
  }

  /**
   * 序列化事件為 JSON
   *
   * @returns 事件的 JSON 表示
   */
  toJSON() {
    return {
      aggregateId: this.userId,
      eventType: this.constructor.name,
      newName: this.newName,
      occurredAt: this.occurredAt.toISOString(),
    }
  }
}
