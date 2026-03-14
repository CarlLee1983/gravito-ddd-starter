import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'

/**
 * OrderCancelled 事件 - 訂單取消時發佈
 */
export class OrderCancelled extends DomainEvent {
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
