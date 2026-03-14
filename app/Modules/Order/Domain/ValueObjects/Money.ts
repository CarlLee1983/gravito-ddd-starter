import { ValueObject } from '@/Foundation/Domain/ValueObject'

/**
 * Money 值物件 - 金額表示
 */
export class Money extends ValueObject<{ amount: number; currency: string }> {
  private constructor(amount: number, currency: string) {
    if (amount < 0) {
      throw new Error('金額不能為負數')
    }
    if (!currency || currency.trim().length === 0) {
      throw new Error('幣種不能為空')
    }
    super({ amount, currency })
  }

  /**
   * 創建 Money
   */
  static create(amount: number, currency: string = 'TWD'): Money {
    return new Money(amount, currency)
  }

  /**
   * 獲取金額
   */
  get amount(): number {
    return this.props.amount
  }

  /**
   * 獲取幣種
   */
  get currency(): string {
    return this.props.currency
  }

  /**
   * 加法操作
   */
  add(other: Money): Money {
    if (this.props.currency !== other.currency) {
      throw new Error(`幣種不匹配: ${this.currency} vs ${other.currency}`)
    }
    return Money.create(this.amount + other.amount, this.currency)
  }

  /**
   * 格式化顯示
   */
  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`
  }
}
