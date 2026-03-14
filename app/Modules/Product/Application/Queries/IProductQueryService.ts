/**
 * @file IProductQueryService.ts
 * @description 產品查詢服務介面，定義 CQRS 架構中讀取側的查詢合約
 */

import type { ProductId } from '../../Domain/ValueObjects/ProductId'
import type { ProductResponseDTO } from '../DTOs/ProductResponseDTO'

/**
 * 產品查詢服務介面
 * @interface IProductQueryService
 */
export interface IProductQueryService {
  /**
   * 根據 ID 尋找產品回應 DTO
   * @param {ProductId} id 產品 ID
   * @returns {Promise<ProductResponseDTO | null>} 產品回應 DTO 或空值
   */
  findById(id: ProductId): Promise<ProductResponseDTO | null>

  /**
   * 取得所有產品回應 DTO
   * @returns {Promise<ProductResponseDTO[]>} 產品回應 DTO 列表
   */
  findAll(): Promise<ProductResponseDTO[]>
}
