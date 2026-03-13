/**
 * @file GetProductService.ts
 * @description 取得產品應用服務
 */

import { ProductId } from '../../Domain/ValueObjects/ProductId'
import type { IProductQueryService } from '../Queries/IProductQueryService'
import type { ProductResponseDTO } from '../DTOs/ProductResponseDTO'

export class GetProductService {
  constructor(private queryService: IProductQueryService) {}

  async execute(id: string): Promise<ProductResponseDTO | null> {
    const productId = ProductId.reconstitute(id)
    return await this.queryService.findById(productId)
  }
}
