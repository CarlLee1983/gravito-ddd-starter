/**
 * @file ProductRepository.ts
 * @description 產品資料倉儲實現 (ORM 無關)
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IEventStore } from '@/Shared/Infrastructure/Ports/Database/IEventStore'
import { BaseEventSourcedRepository } from '@/Shared/Infrastructure/Database/Repositories/BaseEventSourcedRepository'
import { toIntegrationEvent, type IntegrationEvent } from '@/Shared/Domain/IntegrationEvent'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { Product } from '../../Domain/Aggregates/Product'
import { ProductId } from '../../Domain/ValueObjects/ProductId'
import { ProductName } from '../../Domain/ValueObjects/ProductName'
import { Price, Currency } from '../../Domain/ValueObjects/Price'
import { SKU } from '../../Domain/ValueObjects/SKU'
import { StockQuantity } from '../../Domain/ValueObjects/StockQuantity'
import { ProductCreated } from '../../Domain/Events/ProductCreated'
import { ProductPriceChanged } from '../../Domain/Events/ProductPriceChanged'
import { StockAdjusted } from '../../Domain/Events/StockAdjusted'
import type { IProductRepository } from '../../Domain/Repositories/IProductRepository'

export class ProductRepository
  extends BaseEventSourcedRepository<Product>
  implements IProductRepository
{
  constructor(
    db: IDatabaseAccess,
    eventDispatcher?: IEventDispatcher,
    eventStore?: IEventStore
  ) {
    super(db, eventDispatcher, eventStore)
  }

  // ============================================
  // 業務相關方法（實現 IProductRepository）
  // ============================================

  /**
   * 按 SKU 查詢產品
   */
  async findBySku(sku: SKU): Promise<Product | null> {
    const row = await this.db.table(this.getTableName()).where('sku', '=', sku.value).first()
    return row ? this.toDomain(row) : null
  }

  // ============================================
  // 實作抽象方法
  // ============================================

  protected getTableName(): string {
    return 'products'
  }

  protected getAggregateTypeName(): string {
    return 'Product'
  }

  protected toDomain(row: any): Product {
    const name = ProductName.create(row.name as string)
    const price = Price.create(row.amount as number, row.currency as Currency)
    const sku = SKU.create(row.sku as string)
    const stockQuantity = StockQuantity.create(row.stock_quantity as number)
    const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string)

    return Product.reconstitute(row.id as string, name, price, sku, stockQuantity, createdAt)
  }

  protected toRow(product: Product): Record<string, unknown> {
    return {
      id: product.id,
      name: product.name.value,
      amount: product.price.amount,
      currency: product.price.currency,
      sku: product.sku.value,
      stock_quantity: product.stockQuantity.value,
      created_at: product.createdAt.toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  protected toIntegrationEvent(event: DomainEvent): IntegrationEvent | null {
    if (event instanceof ProductCreated) {
      return toIntegrationEvent(event, {
        name: event.name,
        amount: event.amount,
        currency: event.currency,
        sku: event.sku,
        stockQuantity: event.stockQuantity
      })
    } else if (event instanceof ProductPriceChanged) {
      return toIntegrationEvent(event, {
        oldAmount: event.oldAmount,
        oldCurrency: event.oldCurrency,
        newAmount: event.newAmount,
        newCurrency: event.newCurrency
      })
    } else if (event instanceof StockAdjusted) {
      return toIntegrationEvent(event, {
        oldQuantity: event.oldQuantity,
        newQuantity: event.newQuantity
      })
    }

    return null
  }
}
