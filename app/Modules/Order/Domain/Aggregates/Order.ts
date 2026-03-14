/**
 * @file Order.ts
 * @description 訂單聚合根 (Aggregate Root)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：系統的核心業務邏輯模型。
 * - 職責：封裝訂單的狀態與業務規則，實作訂單狀態機，確保訂單生命週期的一致性。
 */

import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { OrderId } from '../ValueObjects/OrderId'
import { OrderStatus, OrderStatusEnum } from '../ValueObjects/OrderStatus'
import { OrderTotal } from '../ValueObjects/OrderTotal'
import { OrderLine } from './OrderLine'
import { Money } from '../ValueObjects/Money'
import { OrderPlaced } from '../Events/OrderPlaced'
import { OrderConfirmed } from '../Events/OrderConfirmed'
import { OrderShipped } from '../Events/OrderShipped'
import { OrderCancelled } from '../Events/OrderCancelled'

/**
 * 訂單聚合根 - 實作訂單業務狀態機
 *
 * 狀態轉換路徑:
 * - Pending (待處理) → Confirmed (已確認) → Shipped (已發貨)
 * - Pending/Confirmed → Cancelled (已取消)
 */
export class Order extends AggregateRoot {
  private _userId: string
  private _lines: OrderLine[]
  private _status: OrderStatus
  private _total: OrderTotal
  private _createdAt: Date
  private _updatedAt: Date

  /**
   * 私有建構子，強制使用靜態工廠方法
   *
   * @param id - 訂單唯一識別碼
   * @param userId - 用戶唯一識別碼
   * @param lines - 訂單行項目清單
   * @param status - 訂單狀態值物件
   * @param total - 訂單總額值物件
   * @param createdAt - 建立時間
   * @param updatedAt - 最後更新時間
   * @private
   */
  private constructor(
    id: OrderId,
    userId: string,
    lines: OrderLine[],
    status: OrderStatus,
    total: OrderTotal,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ) {
    super(id.toString())
    this._userId = userId
    this._lines = lines
    this._status = status
    this._total = total
    this._createdAt = createdAt
    this._updatedAt = updatedAt
  }

  /**
   * 建立新訂單（工廠方法）
   *
   * @param userId - 下單用戶 ID
   * @param lines - 訂單行項目清單
   * @param total - 訂單計算總額
   * @returns 初始狀態為 Pending 的 Order 實體
   * @throws Error 當 userId 為空或 lines 為空時
   */
  static create(userId: string, lines: OrderLine[], total: OrderTotal): Order {
    if (!userId) {
      throw new Error('userId 不能為空')
    }
    if (lines.length === 0) {
      throw new Error('訂單至少需要一個行項目')
    }

    const orderId = OrderId.create()
    const status = OrderStatus.create()
    const order = new Order(orderId, userId, lines, status, total)

    // 發佈 OrderPlaced 事件
    order.raiseEvent(new OrderPlaced(orderId, userId, total))

    return order
  }

  /**
   * 確認訂單，將狀態從 Pending 變更為 Confirmed
   *
   * @throws Error 當訂單不處於 Pending 狀態時
   */
  confirm(): void {
    if (!this._status.isPending()) {
      throw new Error('只能確認 Pending 狀態的訂單')
    }

    this.raiseEvent(new OrderConfirmed(OrderId.fromString(this.id)))
  }

  /**
   * 執行訂單發貨，將狀態變更為 Shipped
   *
   * @param trackingNumber - 選填的物流追蹤單號
   * @throws Error 當訂單未被確認時
   */
  ship(trackingNumber?: string): void {
    if (!this._status.isConfirmed()) {
      throw new Error('只能發貨已確認的訂單')
    }

    this.raiseEvent(new OrderShipped(OrderId.fromString(this.id), trackingNumber))
  }

  /**
   * 取消訂單
   *
   * @param reason - 取消原因說明
   * @throws Error 當訂單已發貨或已取消時
   */
  cancel(reason: string): void {
    if (this._status.isShipped()) {
      throw new Error('已發貨的訂單無法取消')
    }
    if (this._status.isCancelled()) {
      throw new Error('訂單已取消')
    }

    this.raiseEvent(new OrderCancelled(OrderId.fromString(this.id), reason))
  }

  /**
   * 實作 AggregateRoot 的抽象方法：根據領域事件變更內部狀態（事件溯源模式）
   *
   * @param event - 領域事件實體
   */
  applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'OrderConfirmed':
        this._status = OrderStatus.fromString(OrderStatusEnum.CONFIRMED)
        this._updatedAt = new Date()
        break
      case 'OrderShipped':
        this._status = OrderStatus.fromString(OrderStatusEnum.SHIPPED)
        this._updatedAt = new Date()
        break
      case 'OrderCancelled':
        this._status = OrderStatus.fromString(OrderStatusEnum.CANCELLED)
        this._updatedAt = new Date()
        break
    }
  }

  /**
   * 獲取訂單唯一識別碼值物件
   */
  get orderId(): OrderId {
    return OrderId.fromString(this.id)
  }

  /**
   * 獲取下單用戶 ID
   */
  get userId(): string {
    return this._userId
  }

  /**
   * 獲取訂單行項目清單
   */
  get lines(): OrderLine[] {
    return this._lines
  }

  /**
   * 獲取目前訂單狀態值物件
   */
  get status(): OrderStatus {
    return this._status
  }

  /**
   * 獲取訂單總額值物件
   */
  get total(): OrderTotal {
    return this._total
  }

  /**
   * 獲取訂單建立時間
   */
  get createdAt(): Date {
    return this._createdAt
  }

  /**
   * 獲取最後更新時間
   */
  get updatedAt(): Date {
    return this._updatedAt
  }

  /**
   * 檢查訂單是否處於待處理 (Pending) 狀態
   */
  isPending(): boolean {
    return this._status?.isPending() ?? false
  }

  /**
   * 檢查訂單是否處於已確認 (Confirmed) 狀態
   */
  isConfirmed(): boolean {
    return this._status.isConfirmed()
  }

  /**
   * 檢查訂單是否處於已發貨 (Shipped) 狀態
   */
  isShipped(): boolean {
    return this._status.isShipped()
  }

  /**
   * 檢查訂單是否處於已取消 (Cancelled) 狀態
   */
  isCancelled(): boolean {
    return this._status.isCancelled()
  }
}

