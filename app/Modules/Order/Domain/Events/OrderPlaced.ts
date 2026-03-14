/**
 * @file OrderPlaced.ts
 * @description 訂單下單領域事件，當訂單成功建立時觸發
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'
import { OrderTotal } from '../ValueObjects/OrderTotal'

/**
 * OrderPlaced 事件 - 訂單建立時發佈
 * 其他模組（如 Payment）可監聽此事件
 */
export class OrderPlaced extends DomainEvent {
  /**
   * 建立 OrderPlaced 實例
   * @param orderId 訂單唯一識別碼
   * @param userId 下單使用者的唯一識別碼
   * @param orderTotal 訂單的總計金額（包含稅金與小計）
   */
  constructor(orderId: OrderId, userId: string, orderTotal: OrderTotal) {
    super(
      orderId.toString(),
      'OrderPlaced',
      {
        orderId: orderId.toString(),
        userId,
        subtotal: orderTotal.subtotal.amount,
        tax: orderTotal.tax.amount,
        total: orderTotal.total.amount,
        currency: orderTotal.subtotal.currency,
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
