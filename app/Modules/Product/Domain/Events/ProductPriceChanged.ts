/**
 * @file ProductPriceChanged.ts
 * @description 當產品價格變更時觸發的領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 產品價格變更事件
 * @class ProductPriceChanged
 * @extends DomainEvent
 */
export class ProductPriceChanged extends DomainEvent {
  /**
   * 建構函數
   * @param {string} productId 產品 ID
   * @param {number} oldAmount 舊價格金額
   * @param {string} oldCurrency 舊幣別
   * @param {number} newAmount 新價格金額
   * @param {string} newCurrency 新幣別
   */
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

  /**
   * 轉換為 JSON 格式
   * @returns {Record<string, unknown>}
   */
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
