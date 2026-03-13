/**
 * @file IProductRepository.ts
 * @description 產品 Repository 介面（無 ORM 依賴）
 */

import { Product } from '../Aggregates/Product'
import { ProductId } from '../ValueObjects/ProductId'
import { SKU } from '../ValueObjects/SKU'

export interface IProductRepository {
  findById(id: ProductId): Promise<Product | null>
  findBySku(sku: SKU): Promise<Product | null>
  save(product: Product): Promise<void>
}
