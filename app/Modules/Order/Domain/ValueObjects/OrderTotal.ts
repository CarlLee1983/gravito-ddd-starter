/**
 * @file OrderTotal.ts
 * @description 訂單總額值物件 (Value Object)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：訂單聚合的財務概況表示。
 * - 職責：封裝訂單的稅務計算、小計與總額邏輯，確保訂單金額計算的準確性與一致性。
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'
import { Money } from './Money'

/**
 * 訂單總額值物件 - 整合小計、稅金與最終金額
 */
export class OrderTotal extends ValueObject<{ subtotal: Money; tax: Money; total: Money }> {
  /**
   * 私有建構子，執行金額一致性驗證
   *
   * @param subtotal - 商品小計值物件
   * @param tax - 稅金值物件
   * @param total - 訂單總計值物件
   * @throws Error 當幣種不匹配或計算不符合公式 (小計 + 稅金 = 總計) 時
   * @private
   */
  private constructor(subtotal: Money, tax: Money, total: Money) {
    if (tax.currency !== subtotal.currency) {
      throw new Error('稅金幣種必須與小計匹配')
    }
    if (total.currency !== subtotal.currency) {
      throw new Error('總額幣種必須與小計匹配')
    }
    // 驗證計算邏輯
    const expected = subtotal.add(tax)
    if (Math.abs(expected.amount - total.amount) > 0.01) {
      throw new Error('總額計算不正確')
    }
    super({ subtotal, tax, total })
  }

  /**
   * 建立訂單總額值物件（靜態工廠方法）
   *
   * @param subtotal - 商品合計金額
   * @param taxAmount - 選填的稅金金額，預設為 0
   * @returns 封裝完整的 OrderTotal 物件
   */
  static create(subtotal: Money, taxAmount: number = 0): OrderTotal {
    const tax = Money.create(taxAmount, subtotal.currency)
    const total = subtotal.add(tax)
    return new OrderTotal(subtotal, tax, total)
  }

  /**
   * 獲取商品小計
   */
  get subtotal(): Money {
    return this.props.subtotal
  }

  /**
   * 獲取稅金總額
   */
  get tax(): Money {
    return this.props.tax
  }

  /**
   * 獲取訂單最終支付總額
   */
  get total(): Money {
    return this.props.total
  }

  /**
   * 計算目前稅金佔小計的百分比
   *
   * @returns 稅率百分比 (0-100)
   */
  getTaxPercentage(): number {
    if (this.props.subtotal.amount === 0) return 0
    return (this.props.tax.amount / this.props.subtotal.amount) * 100
  }

  /**
   * 取得訂單財務概況的格式化字串
   */
  toString(): string {
    return `小計: ${this.subtotal} | 稅金: ${this.tax} | 總計: ${this.total}`
  }
}

