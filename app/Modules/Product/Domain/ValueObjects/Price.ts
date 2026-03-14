/**
 * @file Price.ts
 * @description 價格值物件 (Value Object)，封裝金額與幣別
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

/**
 * 貨幣列舉
 * @enum {string}
 */
export enum Currency {
  TWD = 'TWD',
  USD = 'USD',
  EUR = 'EUR',
  JPY = 'JPY',
  CNY = 'CNY'
}

interface PriceProps extends Record<string, unknown> {
  readonly amount: number
  readonly currency: Currency
}

/**
 * 價格值物件
 * @class Price
 * @extends ValueObject
 */
export class Price extends ValueObject<PriceProps> {
  /**
   * 私有建構函數
   * @param {PriceProps} props 屬性
   */
  private constructor(props: PriceProps) {
    super(props)
  }

  /**
   * 建立價格實例
   * @param {number} amount 金額
   * @param {Currency} currency 幣別
   * @returns {Price} 價格實例
   * @throws {Error} 當金額為負或幣別無效時拋出錯誤
   */
  static create(amount: number, currency: Currency): Price {
    if (amount < 0) {
      throw new Error(`價格不能為負數，目前：${amount}`)
    }

    if (!Object.values(Currency).includes(currency)) {
      throw new Error(`無效的貨幣類型：${currency}`)
    }

    return new Price({ amount, currency })
  }

  /**
   * 取得金額
   * @returns {number}
   */
  get amount(): number {
    return this.props.amount
  }

  /**
   * 取得幣別
   * @returns {Currency}
   */
  get currency(): Currency {
    return this.props.currency
  }

  /**
   * 轉換為字串表示
   * @returns {string}
   */
  toString(): string {
    return `${this.props.amount} ${this.props.currency}`
  }
}
