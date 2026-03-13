/**
 * @file ProductCreated.ts
 * @description 當新產品被建立時觸發的領域事件
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class ProductCreated extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly sku: string,
    public readonly stockQuantity: number
  ) {
    super(productId, 'ProductCreated', {
      name,
      amount,
      currency,
      sku,
      stockQuantity
    })
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.productId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: {
        name: this.name,
        amount: this.amount,
        currency: this.currency,
        sku: this.sku,
        stockQuantity: this.stockQuantity
      }
    }
  }
}
