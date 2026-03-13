/**
 * @file IProductQueryService.ts
 * @description 產品查詢服務介面 (CQRS 讀側)
 */

import type { ProductId } from '../../Domain/ValueObjects/ProductId'
import type { ProductResponseDTO } from '../DTOs/ProductResponseDTO'

export interface IProductQueryService {
  findById(id: ProductId): Promise<ProductResponseDTO | null>
  findAll(): Promise<ProductResponseDTO[]>
}
