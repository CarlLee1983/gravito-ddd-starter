/**
 * @file ProductQueryService.ts
 * @description 產品查詢服務實現 (CQRS 讀側)
 */

import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'
import type { ProductResponseDTO } from '../../Application/DTOs/ProductResponseDTO'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { ProductId } from '../../Domain/ValueObjects/ProductId'

export class ProductQueryService implements IProductQueryService {
  /**
   * 建構子
   *
   * @param db - 資料庫存取介面
   */
  constructor(private readonly db: IDatabaseAccess) {}

  /**
   * 按 ID 查詢產品
   *
   * @param id - 產品 ID
   * @returns 產品回應 DTO 或 null
   */
  async findById(id: ProductId): Promise<ProductResponseDTO | null> {
    const row = await this.db.table('products').where('id', '=', id.value).first()
    return row ? this.mapToDTO(row) : null
  }

  /**
   * 查詢所有產品
   *
   * @returns 產品回應 DTO 列表
   */
  async findAll(): Promise<ProductResponseDTO[]> {
    try {
      const rows = await this.db.table('products').select()
      return rows.map(row => this.mapToDTO(row))
    } catch (error) {
      console.warn('[ProductQueryService] Failed to fetch products (table might not exist):', error instanceof Error ? error.message : error)
      return []
    }
  }

  /**
   * 將資料庫列轉換為 DTO
   *
   * @param row - 資料庫列資料
   * @returns 產品回應 DTO
   * @private
   */
  private mapToDTO(row: any): ProductResponseDTO {
    return {
      id: row.id,
      name: row.name,
      price: {
        amount: row.amount,
        currency: row.currency
      },
      sku: row.sku,
      stockQuantity: row.stock_quantity,
      isInStock: row.stock_quantity > 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
