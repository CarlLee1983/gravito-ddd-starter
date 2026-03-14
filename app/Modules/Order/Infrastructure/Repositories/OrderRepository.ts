/**
 * @file OrderRepository.ts
 * @description 訂單倉儲 (Repository) 基礎設施層實現
 */

import { Order } from '../../Domain/Aggregates/Order'
import { OrderLine } from '../../Domain/Aggregates/OrderLine'
import { OrderId } from '../../Domain/ValueObjects/OrderId'
import { OrderStatus } from '../../Domain/ValueObjects/OrderStatus'
import { OrderTotal } from '../../Domain/ValueObjects/OrderTotal'
import { Money } from '../../Domain/ValueObjects/Money'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'

/**
 * 訂單倉儲基礎設施層實現
 * 
 * 負責將 Order 聚合根持久化至資料庫。
 * 封裝了對資料庫的具體操作（目前基於 IDatabaseAccess 接口），並在保存後分派聚合根內的領域事件。
 */
export class OrderRepository implements IOrderRepository {
  /**
   * 初始化訂單倉儲
   * 
   * @param db - 資料庫存取介面
   * @param eventDispatcher - 事件分派器
   */
  constructor(
    private readonly db: IDatabaseAccess,
    private readonly eventDispatcher: IEventDispatcher,
  ) {}

  /**
   * 根據 ID 查找單一訂單
   * 
   * @param id - 訂單 ID
   * @returns Promise<Order | null> 找到的訂單聚合根，若無則返回 null
   * @throws Error 當資料庫查詢失敗時拋出
   */
  async findById(id: OrderId): Promise<Order | null> {
    try {
      const repo = this.db.getRepository(Order)
      return await repo.findById(id.toString())
    } catch (error) {
      throw new Error(`查詢訂單失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  /**
   * 根據使用者 ID 查找訂單列表
   * 
   * @param userId - 使用者 ID
   * @returns Promise<Order[]> 訂單聚合根列表
   * @throws Error 當資料庫查詢失敗時拋出
   */
  async findByUserId(userId: string): Promise<Order[]> {
    try {
      const repo = this.db.getRepository(Order)
      return await repo.findBy({ userId })
    } catch (error) {
      throw new Error(`查詢用戶訂單失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  /**
   * 保存新建立的訂單
   * 
   * 將聚合根及其內部實體狀態持久化，並在完成後分派所有未分派的領域事件。
   * 
   * @param order - 要保存的訂單聚合根
   * @returns Promise<Order> 保存後的訂單聚合根
   * @throws Error 當持久化操作失敗時拋出
   */
  async save(order: Order): Promise<Order> {
    try {
      const repo = this.db.getRepository(Order)
      await repo.create({
        id: order.orderId.toString(),
        userId: order.userId,
        status: order.status.toString(),
        lines: order.lines.map((line) => ({
          id: line.id,
          orderId: order.orderId.toString(),
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          unitPrice: line.unitPrice.amount,
          currency: line.unitPrice.currency,
          lineTotal: line.lineTotal.amount,
        })),
        subtotal: order.total.subtotal.amount,
        tax: order.total.tax.amount,
        total: order.total.total.amount,
        currency: order.total.subtotal.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })

      // 分派領域事件
      for (const event of order.getUncommittedEvents()) {
        await this.eventDispatcher.dispatch(event)
      }
      order.markEventsAsCommitted()

      return order
    } catch (error) {
      throw new Error(`保存訂單失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  /**
   * 更新現有訂單狀態或資訊
   * 
   * @param order - 要更新的訂單聚合根
   * @returns Promise<Order> 更新後的訂單聚合根
   * @throws Error 當更新操作失敗時拋出
   */
  async update(order: Order): Promise<Order> {
    try {
      const repo = this.db.getRepository(Order)
      await repo.update(order.orderId.toString(), {
        status: order.status.toString(),
        updatedAt: order.updatedAt,
      })

      // 分派領域事件
      for (const event of order.getUncommittedEvents()) {
        await this.eventDispatcher.dispatch(event)
      }
      order.markEventsAsCommitted()

      return order
    } catch (error) {
      throw new Error(`更新訂單失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  /**
   * 刪除訂單
   * 
   * @param id - 訂單 ID
   * @returns Promise<void>
   * @throws Error 當刪除操作失敗時拋出
   */
  async delete(id: OrderId): Promise<void> {
    try {
      const repo = this.db.getRepository(Order)
      await repo.delete(id.toString())
    } catch (error) {
      throw new Error(`刪除訂單失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  /**
   * 查找系統中所有訂單
   * 
   * @returns Promise<Order[]> 訂單列表
   * @throws Error 當查詢失敗時拋出
   */
  async findAll(): Promise<Order[]> {
    try {
      const repo = this.db.getRepository(Order)
      return await repo.findAll()
    } catch (error) {
      throw new Error(`查詢所有訂單失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  /**
   * 從資料庫原始資料重建 Order 聚合根（內部私有方法）
   * 
   * @param row - 資料庫返回的原始行資料
   * @returns Order 聚合根實例
   */
  private rebuildOrder(row: any): Order {
    const orderId = OrderId.fromString(row.id)
    const status = OrderStatus.fromString(row.status)
    const subtotal = Money.create(row.subtotal, row.currency)
    const orderTotal = OrderTotal.create(subtotal, row.tax)

    const lines = (row.lines || []).map((lineRow: any) =>
      OrderLine.create(
        lineRow.productId,
        lineRow.productName,
        lineRow.quantity,
        Money.create(lineRow.unitPrice, lineRow.currency),
      ),
    )

    return new Order(
      orderId,
      row.userId,
      lines,
      status,
      orderTotal,
      new Date(row.createdAt),
      new Date(row.updatedAt),
    )
  }
}
