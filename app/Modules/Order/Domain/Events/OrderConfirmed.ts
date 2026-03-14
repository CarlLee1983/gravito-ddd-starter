/**
 * @file OrderConfirmed.ts
 * @description 訂單確認領域事件，當訂單被確認時觸發
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'

/**
 * OrderConfirmed 事件 - 訂單確認時發佈
 */
export class OrderConfirmed extends DomainEvent {
  /**
   * 建立 OrderConfirmed 實例
   * @param orderId 訂單唯一識別碼
   */
  constructor(orderId: OrderId) {
    super(
      orderId.toString(),
      'OrderConfirmed',
      {
        orderId: orderId.toString(),
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
