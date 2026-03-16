/**
 * @file ProductRepository.ts
 * @description 產品資料倉儲實現 (ORM 無關)
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import type { IEventStore } from '@/Foundation/Infrastructure/Ports/Database/IEventStore'
import { BaseEventSourcedRepository } from '@/Foundation/Infrastructure/Database/Repositories/BaseEventSourcedRepository'
import { toIntegrationEvent, type IntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
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
  /**
   * 建構子
   *
   * @param db - 資料庫存取介面
   * @param eventDispatcher - 事件分發器
   * @param eventStore - 事件存儲
   */
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
   *
   * @param sku - 產品 SKU
   * @returns 產品聚合根或 null
   */
  async findBySku(sku: SKU): Promise<Product | null> {
    const row = await this.db.table(this.getTableName()).where('sku', '=', sku.value).first()
    return row ? this.toDomain(row) : null
  }

  // ============================================
  // 實作抽象方法
  // ============================================

  /**
   * 取得資料表名稱
   *
   * @returns 資料表名稱
   * @protected
   */
  protected getTableName(): string {
    return 'products'
  }

  /**
   * 取得聚合類型名稱
   *
   * @returns 聚合類型名稱
   * @protected
   */
  protected getAggregateTypeName(): string {
    return 'Product'
  }

  /**
   * 將資料庫列轉換為領域模型
   *
   * @param row - 資料庫列資料
   * @returns 產品聚合根
   * @protected
   */
  protected toDomain(row: any): Product {
    const name = ProductName.create(row.name as string)
    const price = Price.create(row.amount as number, row.currency as Currency)
    const sku = SKU.create(row.sku as string)
    const stockQuantity = StockQuantity.create(row.stock_quantity as number)
    const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string)

    return Product.reconstitute(row.id as string, name, price, sku, stockQuantity, createdAt)
  }

  /**
   * 將領域模型轉換為資料庫列
   *
   * @param product - 產品聚合根
   * @returns 資料庫列資料
   * @protected
   */
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

  /**
   * 將領域事件轉換為集成事件
   *
   * @param event - 領域事件
   * @returns 集成事件或 null
   * @protected
   */
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
