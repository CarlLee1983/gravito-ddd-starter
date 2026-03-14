/**
 * @file OrderId.ts
 * @description 訂單唯一識別碼值物件 (Value Object)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：訂單聚合的識別碼。
 * - 職責：封裝訂單 ID 的生成與驗證邏輯，確保識別碼的一致性。
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

/**
 * 訂單唯一識別碼值物件
 */
export class OrderId extends ValueObject<{ value: string }> {
  /**
   * 私有建構子
   *
   * @param value - UUID 字串
   * @private
   */
  private constructor(value: string) {
    super({ value })
  }

  /**
   * 生成全新的 OrderId（使用隨機 UUID）
   *
   * @param value - 選填的初始 ID 值，預設為隨機 UUID
   * @returns 新的 OrderId 實體
   * @throws Error 當 ID 值為空或格式不正確時
   */
  static create(value: string = crypto.randomUUID()): OrderId {
    if (!value || value.trim().length === 0) {
      throw new Error('OrderId 不能為空')
    }
    return new OrderId(value)
  }

  /**
   * 從現有的字串還原 OrderId
   *
   * @param value - 既存的 ID 字串
   * @returns 還原後的 OrderId 實體
   */
  static fromString(value: string): OrderId {
    return new OrderId(value)
  }

  /**
   * 獲取 ID 的原始字串值
   */
  get value(): string {
    return this.props.value
  }

  /**
   * 轉換為字串形式
   */
  toString(): string {
    return this.props.value
  }
}

