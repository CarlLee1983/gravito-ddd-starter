/**
 * @file CreateProductService.ts
 * @description 建立產品應用服務
 */

import { Product } from '../../Domain/Aggregates/Product'
import { ProductName } from '../../Domain/ValueObjects/ProductName'
import { Price, Currency } from '../../Domain/ValueObjects/Price'
import { SKU } from '../../Domain/ValueObjects/SKU'
import { StockQuantity } from '../../Domain/ValueObjects/StockQuantity'
import { ProductId } from '../../Domain/ValueObjects/ProductId'
import type { IProductRepository } from '../../Domain/Repositories/IProductRepository'

export class CreateProductService {
  constructor(private productRepository: IProductRepository) {}

  async execute(data: {
    name: string
    amount: number
    currency: string
    sku: string
    stockQuantity: number
  }): Promise<string> {
    // SKU 唯一性檢查
    const skuObj = SKU.create(data.sku)
    const existing = await this.productRepository.findBySku(skuObj)
    if (existing) {
      throw new Error(`SKU ${data.sku} 已存在`)
    }

    // 建立聚合根
    const id = ProductId.create().value
    const name = ProductName.create(data.name)
    const price = Price.create(data.amount, data.currency as Currency)
    const stockQuantity = StockQuantity.create(data.stockQuantity)

    const product = Product.create(id, name, price, skuObj, stockQuantity)

    // 保存
    await this.productRepository.save(product)

    return id
  }
}
