/**
 * @file CreateProductService.ts
 * @description 建立產品應用服務，處理產品建立的業務流程
 */

import { Product } from '../../Domain/Aggregates/Product'
import { ProductName } from '../../Domain/ValueObjects/ProductName'
import { Price, Currency } from '../../Domain/ValueObjects/Price'
import { SKU } from '../../Domain/ValueObjects/SKU'
import { StockQuantity } from '../../Domain/ValueObjects/StockQuantity'
import { ProductId } from '../../Domain/ValueObjects/ProductId'
import type { IProductRepository } from '../../Domain/Repositories/IProductRepository'

/**
 * 建立產品應用服務
 * @class CreateProductService
 */
export class CreateProductService {
  /**
   * 建構函數
   * @param {IProductRepository} productRepository 產品 Repository
   */
  constructor(private productRepository: IProductRepository) {}

  /**
   * 執行建立產品流程
   * @param {Object} data 建立產品的資料
   * @param {string} data.name 產品名稱
   * @param {number} data.amount 價格金額
   * @param {string} data.currency 幣別
   * @param {string} data.sku SKU
   * @param {number} data.stockQuantity 庫存數量
   * @returns {Promise<string>} 回傳建立成功的產品 ID
   * @throws {Error} 當 SKU 已存在或資料驗證失敗時拋出錯誤
   */
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
