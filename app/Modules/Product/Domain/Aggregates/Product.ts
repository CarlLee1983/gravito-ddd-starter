/**
 * @file Product.ts
 * @description 產品聚合根 (Aggregate Root)，封裝產品的核心邏輯與狀態變更
 */

import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import { ProductCreated } from '../Events/ProductCreated'
import { ProductPriceChanged } from '../Events/ProductPriceChanged'
import { StockAdjusted } from '../Events/StockAdjusted'
import { ProductName } from '../ValueObjects/ProductName'
import { Price, Currency } from '../ValueObjects/Price'
import { SKU } from '../ValueObjects/SKU'
import { StockQuantity } from '../ValueObjects/StockQuantity'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 產品聚合根
 * @class Product
 * @extends AggregateRoot
 */
export class Product extends AggregateRoot {
  private _name!: ProductName
  private _price!: Price
  private _sku!: SKU
  private _stockQuantity!: StockQuantity
  protected _createdAt!: Date

  /**
   * 私有建構函數
   * @param {string} id 產品 ID
   */
  private constructor(id: string) {
    super(id)
  }

  /**
   * 建立新的產品實例
   * @param {string} id 產品 ID
   * @param {ProductName} name 產品名稱
   * @param {Price} price 產品價格
   * @param {SKU} sku 產品 SKU
   * @param {StockQuantity} stockQuantity 庫存數量
   * @returns {Product} 產品實例
   */
  static create(
    id: string,
    name: ProductName,
    price: Price,
    sku: SKU,
    stockQuantity: StockQuantity
  ): Product {
    const product = new Product(id)

    product.raiseEvent(
      new ProductCreated(
        id,
        name.value,
        price.amount,
        price.currency,
        sku.value,
        stockQuantity.value
      )
    )

    return product
  }

  /**
   * 重構產品實例（從持久化層還原）
   * @param {string} id 產品 ID
   * @param {ProductName} name 產品名稱
   * @param {Price} price 產品價格
   * @param {SKU} sku 產品 SKU
   * @param {StockQuantity} stockQuantity 庫存數量
   * @param {Date} createdAt 建立時間
   * @returns {Product} 產品實例
   */
  static reconstitute(
    id: string,
    name: ProductName,
    price: Price,
    sku: SKU,
    stockQuantity: StockQuantity,
    createdAt: Date
  ): Product {
    const product = new Product(id)
    product._name = name
    product._price = price
    product._sku = sku
    product._stockQuantity = stockQuantity
    product._createdAt = new Date(createdAt.getTime())
    return product
  }

  /**
   * 應用領域事件以更新狀態
   * @param {DomainEvent} event 領域事件
   * @returns {void}
   */
  applyEvent(event: DomainEvent): void {
    if (event instanceof ProductCreated) {
      this._name = ProductName.create(event.name)
      this._price = Price.create(event.amount, event.currency as Currency)
      this._sku = SKU.create(event.sku)
      this._stockQuantity = StockQuantity.create(event.stockQuantity)
      this._createdAt = new Date()
    } else if (event instanceof ProductPriceChanged) {
      this._price = Price.create(event.newAmount, event.newCurrency as Currency)
    } else if (event instanceof StockAdjusted) {
      this._stockQuantity = StockQuantity.create(event.newQuantity)
    }
  }

  /**
   * 變更產品價格
   * @param {Price} newPrice 新價格
   * @returns {void}
   */
  changePrice(newPrice: Price): void {
    if (this._price.equals(newPrice)) {
      return
    }

    this.raiseEvent(
      new ProductPriceChanged(
        this.id,
        this._price.amount,
        this._price.currency,
        newPrice.amount,
        newPrice.currency
      )
    )
  }

  /**
   * 調整產品庫存
   * @param {StockQuantity} quantity 新的庫存數量
   * @returns {void}
   */
  adjustStock(quantity: StockQuantity): void {
    if (this._stockQuantity.equals(quantity)) {
      return
    }

    this.raiseEvent(
      new StockAdjusted(this.id, this._stockQuantity.value, quantity.value)
    )
  }

  /**
   * 取得產品名稱
   * @returns {ProductName}
   */
  get name(): ProductName {
    return this._name
  }

  /**
   * 取得產品價格
   * @returns {Price}
   */
  get price(): Price {
    return this._price
  }

  /**
   * 取得產品 SKU
   * @returns {SKU}
   */
  get sku(): SKU {
    return this._sku
  }

  /**
   * 取得庫存數量
   * @returns {StockQuantity}
   */
  get stockQuantity(): StockQuantity {
    return this._stockQuantity
  }

  /**
   * 取得建立時間
   * @returns {Date}
   */
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
