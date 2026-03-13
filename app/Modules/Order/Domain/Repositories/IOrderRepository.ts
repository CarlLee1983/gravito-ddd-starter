import { Order } from '../Aggregates/Order'
import { OrderId } from '../ValueObjects/OrderId'

/**
 * IOrderRepository 介面
 * Domain 層不知道 ORM 選擇，只依賴此介面
 */
export interface IOrderRepository {
  /**
   * 根據 ID 查找訂單
   */
  findById(id: OrderId): Promise<Order | null>

  /**
   * 根據用戶 ID 查找訂單列表
   */
  findByUserId(userId: string): Promise<Order[]>

  /**
   * 保存訂單
   */
  save(order: Order): Promise<Order>

  /**
   * 更新訂單
   */
  update(order: Order): Promise<Order>

  /**
   * 刪除訂單
   */
  delete(id: OrderId): Promise<void>

  /**
   * 查找所有訂單
   */
  findAll(): Promise<Order[]>
}
