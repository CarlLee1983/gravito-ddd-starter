/**
 * @file ProductCreated.ts
 * @description 當新產品被建立時觸發的領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 產品建立事件
 * @class ProductCreated
 * @extends DomainEvent
 */
export class ProductCreated extends DomainEvent {
  /**
   * 建構函數
   * @param {string} productId 產品 ID
   * @param {string} name 產品名稱
   * @param {number} amount 價格金額
   * @param {string} currency 幣別
   * @param {string} sku SKU
   * @param {number} stockQuantity 庫存數量
   */
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
        name: this.name,
        amount: this.amount,
        currency: this.currency,
        sku: this.sku,
        stockQuantity: this.stockQuantity
      }
    }
  }
}
