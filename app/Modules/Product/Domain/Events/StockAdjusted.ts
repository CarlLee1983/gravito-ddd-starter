/**
 * @file StockAdjusted.ts
 * @description 當產品庫存調整時觸發的領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class StockAdjusted extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly oldQuantity: number,
    public readonly newQuantity: number
  ) {
    super(productId, 'StockAdjusted', {
      oldQuantity,
      newQuantity
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
        oldQuantity: this.oldQuantity,
        newQuantity: this.newQuantity
      }
    }
  }
}
