/**
 * @file Money.ts
 * @description 金額值物件 (Value Object)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：通用的領域值物件。
 * - 職責：封裝金額數值與幣種資訊，提供安全的金額運算與格式化功能。
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

/**
 * 金額值物件 - 負責處理所有與金錢相關的邏輯
 */
export class Money extends ValueObject<{ amount: number; currency: string }> {
  /**
   * 私有建構子，執行基礎驗證
   *
   * @param amount - 金額數值
   * @param currency - 幣種 (例如: TWD, USD)
   * @throws Error 當金額為負數或幣種為空時
   * @private
   */
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
   * 建立 Money 值物件（靜態工廠方法）
   *
   * @param amount - 金額數值
   * @param currency - 幣種，預設為 'TWD'
   * @returns 新的 Money 值物件
   */
  static create(amount: number, currency: string = 'TWD'): Money {
    return new Money(amount, currency)
  }

  /**
   * 獲取金額數值
   */
  get amount(): number {
    return this.props.amount
  }

  /**
   * 獲取幣種資訊
   */
  get currency(): string {
    return this.props.currency
  }

  /**
   * 執行金額加法運算
   *
   * @param other - 另一個要加上的 Money 物件
   * @returns 運算後的全新 Money 物件
   * @throws Error 當兩者幣種不一致時
   */
  add(other: Money): Money {
    if (this.props.currency !== other.currency) {
      throw new Error(`幣種不匹配: ${this.currency} vs ${other.currency}`)
    }
    return Money.create(this.amount + other.amount, this.currency)
  }

  /**
   * 取得金額的字串表示形式 (例如: "TWD 100.00")
   */
  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`
  }
}

