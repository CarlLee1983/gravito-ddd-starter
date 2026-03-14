import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'
import { OrderTotal } from '../ValueObjects/OrderTotal'

/**
 * OrderPlaced 事件 - 訂單建立時發佈
 * 其他模組（如 Payment）可監聽此事件
 */
export class OrderPlaced extends DomainEvent {
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
