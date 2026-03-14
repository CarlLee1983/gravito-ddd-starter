/**
 * @file OrderShipped.ts
 * @description 訂單發貨領域事件，當訂單完成出貨時觸發
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'

/**
 * OrderShipped 事件 - 訂單發貨時發佈
 */
export class OrderShipped extends DomainEvent {
  /**
   * 建立 OrderShipped 實例
   * @param orderId 訂單唯一識別碼
   * @param trackingNumber 貨物追踪單號（選填）
   */
  constructor(orderId: OrderId, trackingNumber?: string) {
    super(
      orderId.toString(),
      'OrderShipped',
      {
        orderId: orderId.toString(),
        trackingNumber,
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
