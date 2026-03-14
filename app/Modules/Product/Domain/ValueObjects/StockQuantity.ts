/**
 * @file StockQuantity.ts
 * @description 庫存數量值物件 (Value Object)
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface StockQuantityProps extends Record<string, unknown> {
  readonly value: number
}

/**
 * 庫存數量值物件
 * @class StockQuantity
 * @extends ValueObject
 */
export class StockQuantity extends ValueObject<StockQuantityProps> {
  /**
   * 私有建構函數
   * @param {StockQuantityProps} props 屬性
   */
  private constructor(props: StockQuantityProps) {
    super(props)
  }

  /**
   * 建立庫存數量實例
   * @param {number} quantity 數量
   * @returns {StockQuantity} 庫存數量實例
   * @throws {Error} 當數量不是整數或為負數時拋出錯誤
   */
  static create(quantity: number): StockQuantity {
    if (!Number.isInteger(quantity)) {
      throw new Error(`庫存數量必須是整數，目前：${quantity}`)
    }

    if (quantity < 0) {
      throw new Error(`庫存數量不能為負數，目前：${quantity}`)
    }

    return new StockQuantity({ value: quantity })
  }

  /**
   * 取得數量值
   * @returns {number}
   */
  get value(): number {
    return this.props.value
  }

  /**
   * 判斷是否有庫存
   * @returns {boolean}
   */
  isInStock(): boolean {
    return this.props.value > 0
  }

  /**
   * 轉換為字串
   * @returns {string}
   */
  toString(): string {
    return this.props.value.toString()
  }
}
