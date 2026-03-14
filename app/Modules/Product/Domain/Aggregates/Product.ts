/**
 * @file Product.ts
 * @description 產品聚合根 (Aggregate Root)
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

export class Product extends AggregateRoot {
  private _name!: ProductName
  private _price!: Price
  private _sku!: SKU
  private _stockQuantity!: StockQuantity
  protected _createdAt!: Date

  private constructor(id: string) {
    super(id)
  }

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

  adjustStock(quantity: StockQuantity): void {
    if (this._stockQuantity.equals(quantity)) {
      return
    }

    this.raiseEvent(
      new StockAdjusted(this.id, this._stockQuantity.value, quantity.value)
    )
  }

  // Getters
  get name(): ProductName {
    return this._name
  }

  get price(): Price {
    return this._price
  }

  get sku(): SKU {
    return this._sku
  }

  get stockQuantity(): StockQuantity {
    return this._stockQuantity
  }

  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
