/**
 * @file ProductPriceChanged.ts
 * @description 當產品價格變更時觸發的領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class ProductPriceChanged extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly oldAmount: number,
    public readonly oldCurrency: string,
    public readonly newAmount: number,
    public readonly newCurrency: string
  ) {
    super(productId, 'ProductPriceChanged', {
      oldAmount,
      oldCurrency,
      newAmount,
      newCurrency
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
        oldAmount: this.oldAmount,
        oldCurrency: this.oldCurrency,
        newAmount: this.newAmount,
        newCurrency: this.newCurrency
      }
    }
  }
}
