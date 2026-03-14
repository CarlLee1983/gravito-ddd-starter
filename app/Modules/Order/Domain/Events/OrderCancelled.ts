/**
 * @file OrderCancelled.ts
 * @description 訂單取消領域事件，當訂單被取消時觸發
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'

/**
 * OrderCancelled 事件 - 訂單取消時發佈
 */
export class OrderCancelled extends DomainEvent {
  /**
   * 建立 OrderCancelled 實例
   * @param orderId 訂單唯一識別碼
   * @param reason 取消訂單的原因
   */
  constructor(orderId: OrderId, reason: string) {
    super(
      orderId.toString(),
      'OrderCancelled',
      {
        orderId: orderId.toString(),
        reason,
      },
      1,
    )
  }

  /**
   * 將事件轉換為 JSON 物件
   * @returns 包含事件資料的鍵值對物件
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: this.data,
    }
  }
}
