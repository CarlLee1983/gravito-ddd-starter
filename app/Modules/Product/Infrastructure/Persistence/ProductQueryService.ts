/**
 * @file ProductQueryService.ts
 * @description 產品查詢服務實現 (CQRS 讀側)
 */

import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'
import type { ProductResponseDTO } from '../../Application/DTOs/ProductResponseDTO'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import { ProductId } from '../../Domain/ValueObjects/ProductId'

export class ProductQueryService implements IProductQueryService {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: ProductId): Promise<ProductResponseDTO | null> {
    const row = await this.db.table('products').where('id', '=', id.value).first()
    return row ? this.mapToDTO(row) : null
  }

  async findAll(): Promise<ProductResponseDTO[]> {
    try {
      const rows = await this.db.table('products').select()
      return rows.map(row => this.mapToDTO(row))
    } catch (error) {
      console.warn('[ProductQueryService] Failed to fetch products (table might not exist):', error instanceof Error ? error.message : error)
      return []
    }
  }

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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
