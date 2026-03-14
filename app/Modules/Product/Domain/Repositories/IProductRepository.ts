/**
 * @file IProductRepository.ts
 * @description 產品 Repository 介面，定義產品領域實體的持久化合約
 */

import { Product } from '../Aggregates/Product'
import { ProductId } from '../ValueObjects/ProductId'
import { SKU } from '../ValueObjects/SKU'

/**
 * 產品 Repository 介面
 * @interface IProductRepository
 */
export interface IProductRepository {
  /**
   * 根據 ID 尋找產品
   * @param {ProductId} id 產品 ID
   * @returns {Promise<Product | null>} 產品實體或空值
   */
  findById(id: ProductId): Promise<Product | null>

  /**
   * 根據 SKU 尋找產品
   * @param {SKU} sku 產品 SKU
   * @returns {Promise<Product | null>} 產品實體或空值
   */
  findBySku(sku: SKU): Promise<Product | null>

  /**
   * 儲存產品實體
   * @param {Product} product 產品實體
   * @returns {Promise<void>}
   */
  save(product: Product): Promise<void>
}
