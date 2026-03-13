import { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'

/**
 * OrderShipped 事件 - 訂單發貨時發佈
 */
export class OrderShipped extends DomainEvent {
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
