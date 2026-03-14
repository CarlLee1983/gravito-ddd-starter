import { BaseEntity } from '@/Foundation/Domain/BaseEntity'
import { Money } from '../ValueObjects/Money'

/**
 * OrderLine 實體 - 訂單行項目
 */
export class OrderLine extends BaseEntity {
  private readonly _productId: string
  private readonly _productName: string
  private readonly _quantity: number
  private readonly _unitPrice: Money
  private readonly _lineTotal: Money

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
   * 創建新的 OrderLine
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
   * 獲取數量
   */
  get quantity(): number {
    return this._quantity
  }

  /**
   * 獲取單價
   */
  get unitPrice(): Money {
    return this._unitPrice
  }

  /**
   * 獲取行項目總額
   */
  get lineTotal(): Money {
    return this._lineTotal
  }
}
