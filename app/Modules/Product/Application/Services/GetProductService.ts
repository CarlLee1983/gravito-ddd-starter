/**
 * @file GetProductService.ts
 * @description 取得產品應用服務，處理查詢單一產品的業務請求
 */

import { ProductId } from '../../Domain/ValueObjects/ProductId'
import type { IProductQueryService } from '../Queries/IProductQueryService'
import type { ProductResponseDTO } from '../DTOs/ProductResponseDTO'

/**
 * 取得產品應用服務
 * @class GetProductService
 */
export class GetProductService {
  /**
   * 建構函數
   * @param {IProductQueryService} queryService 產品查詢服務
   */
  constructor(private queryService: IProductQueryService) {}

  /**
   * 執行取得產品流程
   * @param {string} id 產品 ID 字串
   * @returns {Promise<ProductResponseDTO | null>} 回傳產品回應 DTO 或空值
   * @throws {Error} 當 ID 格式無效時拋出錯誤
   */
  async execute(id: string): Promise<ProductResponseDTO | null> {
    const productId = ProductId.reconstitute(id)
    return await this.queryService.findById(productId)
  }
}
