import { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'

/**
 * OrderConfirmed 事件 - 訂單確認時發佈
 */
export class OrderConfirmed extends DomainEvent {
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
