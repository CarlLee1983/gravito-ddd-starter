import { ValueObject } from '@/Foundation/Domain/ValueObject'
import { Money } from './Money'

/**
 * OrderTotal 值物件 - 訂單總額
 */
export class OrderTotal extends ValueObject<{ subtotal: Money; tax: Money; total: Money }> {
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
   * 創建 OrderTotal
   */
  static create(subtotal: Money, taxAmount: number = 0): OrderTotal {
    const tax = Money.create(taxAmount, subtotal.currency)
    const total = subtotal.add(tax)
    return new OrderTotal(subtotal, tax, total)
  }

  /**
   * 獲取小計
   */
  get subtotal(): Money {
    return this.props.subtotal
  }

  /**
   * 獲取稅金
   */
  get tax(): Money {
    return this.props.tax
  }

  /**
   * 獲取總額
   */
  get total(): Money {
    return this.props.total
  }

  /**
   * 獲取稅率百分比
   */
  getTaxPercentage(): number {
    if (this.props.subtotal.amount === 0) return 0
    return (this.props.tax.amount / this.props.subtotal.amount) * 100
  }

  /**
   * 格式化顯示
   */
  toString(): string {
    return `小計: ${this.subtotal} | 稅: ${this.tax} | 總計: ${this.total}`
  }
}
