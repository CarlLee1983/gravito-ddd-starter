/**
 * @file StockAdjusted.ts
 * @description 當產品庫存調整時觸發的領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 庫存調整事件
 * @class StockAdjusted
 * @extends DomainEvent
 */
export class StockAdjusted extends DomainEvent {
  /**
   * 建構函數
   * @param {string} productId 產品 ID
   * @param {number} oldQuantity 舊庫存數量
   * @param {number} newQuantity 新庫存數量
   */
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
        oldQuantity: this.oldQuantity,
        newQuantity: this.newQuantity
      }
    }
  }
}
