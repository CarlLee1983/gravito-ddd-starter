/**
 * @file OrderLine.ts
 * @description 訂單行項目實體 (Entity)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：訂單聚合內的實體。
 * - 職責：代表訂單中的單一商品項目，包含產品資訊、購買數量及小計金額。
 */

import { BaseEntity } from '@/Foundation/Domain/BaseEntity'
import { Money } from '../ValueObjects/Money'

/**
 * 訂單行項目實體 - 代表訂單中的具體商品細目
 */
export class OrderLine extends BaseEntity {
  private readonly _productId: string
  private readonly _productName: string
  private readonly _quantity: number
  private readonly _unitPrice: Money
  private readonly _lineTotal: Money

  /**
   * 私有建構子
   *
   * @param id - 行項目唯一識別碼
   * @param productId - 產品 ID
   * @param productName - 產品名稱
   * @param quantity - 購買數量
   * @param unitPrice - 單價值物件
   * @param lineTotal - 行項目總計值物件
   * @private
   */
  private constructor(
    id: string,
    productId: string,
    productName: string,
    quantity: number,
    unitPrice: Money,
    lineTotal: Money,
  ) {
    super(id)
    this._productId = productId
    this._productName = productName
    this._quantity = quantity
    this._unitPrice = unitPrice
    this._lineTotal = lineTotal
  }

  /**
   * 建立新的 OrderLine 實體
   *
   * @param productId - 產品 ID
   * @param productName - 產品名稱
   * @param quantity - 購買數量
   * @param unitPrice - 商品單價
   * @returns 新建立的 OrderLine 實體
   * @throws Error 當數量小於等於 0 或產品資訊缺失時
   */
  static create(
    productId: string,
    productName: string,
    quantity: number,
    unitPrice: Money,
  ): OrderLine {
    if (quantity <= 0) {
      throw new Error('數量必須大於 0')
    }
    if (!productId || !productName) {
      throw new Error('產品 ID 和名稱不能為空')
    }

    const lineTotal = Money.create(
      unitPrice.amount * quantity,
      unitPrice.currency,
    )
    const id = crypto.randomUUID()

    return new OrderLine(id, productId, productName, quantity, unitPrice, lineTotal)
  }

  /**
   * 獲取產品 ID
   */
  get productId(): string {
    return this._productId
  }

  /**
   * 獲取產品名稱
   */
  get productName(): string {
    return this._productName
  }

  /**
   * 獲取購買數量
   */
  get quantity(): number {
    return this._quantity
  }

  /**
   * 獲取產品單價
   */
  get unitPrice(): Money {
    return this._unitPrice
  }

  /**
   * 獲取該行項目的總額 (單價 * 數量)
   */
  get lineTotal(): Money {
    return this._lineTotal
  }
}

