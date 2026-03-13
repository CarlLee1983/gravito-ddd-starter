import { Order } from '../../Domain/Aggregates/Order'
import { OrderLine } from '../../Domain/Aggregates/OrderLine'
import { OrderId } from '../../Domain/ValueObjects/OrderId'
import { OrderStatus } from '../../Domain/ValueObjects/OrderStatus'
import { OrderTotal } from '../../Domain/ValueObjects/OrderTotal'
import { Money } from '../../Domain/ValueObjects/Money'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'

/**
 * OrderRepository - Infrastructure 層實現
 * 此層包含 ORM 具體實現（目前使用 Gravito），可輕鬆替換為其他 ORM
 */
export class OrderRepository implements IOrderRepository {
  constructor(
    private readonly db: IDatabaseAccess,
    private readonly eventDispatcher: IEventDispatcher,
  ) {}

  /**
   * 根據 ID 查找訂單
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
   * 根據用戶 ID 查找訂單列表
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
   * 保存訂單（新建）
   */
  async save(order: Order): Promise<Order> {
    try {
      const repo = this.db.getRepository(Order)
      const saved = await repo.create({
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
   * 更新訂單
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
   * 查找所有訂單
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
   * 重建 Order 聚合根從資料庫記錄
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
