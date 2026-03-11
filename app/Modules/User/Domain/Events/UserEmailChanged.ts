/**
 * @file UserEmailChanged.ts
 * @description 用戶電子郵件變更事件
 *
 * 在 DDD 中代表「用戶決定變更其電子郵件」的業務事件。
 * 由 User.changeEmail() 發佈，Repository 層分派。
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 用戶電子郵件變更領域事件
 *
 * 表示用戶電子郵件已被修改的不可逆事實。
 * 用於 Event Sourcing 重建用戶狀態，以及跨 Bounded Context 通知。
 */
export class UserEmailChanged extends DomainEvent {
  /**
   * 建立 UserEmailChanged 事件
   *
   * @param userId - 變更郵件的用戶 ID
   * @param newEmail - 新的電子郵件
   * @param occurredAt - 事件發生時間（預設為現在）
   */
  constructor(
    public readonly userId: string,
    public readonly newEmail: string,
    occurredAt: Date = new Date(),
  ) {
    super(occurredAt)
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
      newEmail: this.newEmail,
      occurredAt: this.occurredAt.toISOString(),
    }
  }
}
