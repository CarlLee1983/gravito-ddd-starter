/**
 * @file IOrderRepository.ts
 * @description 訂單倉儲介面 (Repository Interface)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：定義資料持久化的契約。
 * - 職責：規定訂單聚合根的儲存與檢索標準，將領域邏輯與具體的資料庫實作解耦。
 */

import { Order } from '../Aggregates/Order'
import { OrderId } from '../ValueObjects/OrderId'

/**
 * 訂單倉儲介面
 *
 * 所有訂單相關的資料操作（如：儲存、查詢、管理）均需遵循此介面定義。
 */
export interface IOrderRepository {
  /**
   * 根據唯一識別碼查找訂單
   *
   * @param id - 訂單唯一識別碼值物件
   * @returns 找到的訂單聚合根，若無則傳回 null
   */
  findById(id: OrderId): Promise<Order | null>

  /**
   * 根據用戶 ID 查找該用戶的所有訂單
   *
   * @param userId - 使用者唯一識別碼
   * @returns 該使用者的訂單聚合根陣列
   */
  findByUserId(userId: string): Promise<Order[]>

  /**
   * 保存（建立）新訂單聚合根
   *
   * @param order - 要持久化的新訂單實體
   * @returns 保存後的訂單聚合根實體
   */
  save(order: Order): Promise<Order>

  /**
   * 更新現有的訂單聚合根狀態
   *
   * @param order - 已變更狀態的訂單實體
   * @returns 更新後的訂單聚合根實體
   */
  update(order: Order): Promise<Order>

  /**
   * 根據 ID 刪除指定的訂單
   *
   * @param id - 要刪除的訂單 ID
   */
  delete(id: OrderId): Promise<void>

  /**
   * 獲取系統中的所有訂單
   *
   * @returns 所有的訂單聚合根陣列
   */
  findAll(): Promise<Order[]>
}

