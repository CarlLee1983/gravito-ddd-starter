import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
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
 * Order 聚合根 - 訂單狀態機
 * 狀態轉換: Pending → Confirmed → Shipped
 *                   ↓
 *              Cancelled (僅可從 Pending/Confirmed 轉換)
 */
export class Order extends AggregateRoot {
  private _userId: string
  private _lines: OrderLine[]
  private _status: OrderStatus
  private _total: OrderTotal
  private _createdAt: Date
  private _updatedAt: Date

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
   * 建立新訂單
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
   * 確認訂單
   */
  confirm(): void {
    if (!this._status.isPending()) {
      throw new Error('只能確認 Pending 狀態的訂單')
    }

    this.raiseEvent(new OrderConfirmed(OrderId.fromString(this.id)))
  }

  /**
   * 發貨
   */
  ship(trackingNumber?: string): void {
    if (!this._status.isConfirmed()) {
      throw new Error('只能發貨已確認的訂單')
    }

    this.raiseEvent(new OrderShipped(OrderId.fromString(this.id), trackingNumber))
  }

  /**
   * 取消訂單
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
   * 應用領域事件到聚合狀態（Event Sourcing）
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
   * 獲取訂單 ID
   */
  get orderId(): OrderId {
    return OrderId.fromString(this.id)
  }

  /**
   * 獲取用戶 ID
   */
  get userId(): string {
    return this._userId
  }

  /**
   * 獲取訂單行項目
   */
  get lines(): OrderLine[] {
    return this._lines
  }

  /**
   * 獲取訂單狀態
   */
  get status(): OrderStatus {
    return this._status
  }

  /**
   * 獲取訂單總額
   */
  get total(): OrderTotal {
    return this._total
  }

  /**
   * 獲取建立時間
   */
  get createdAt(): Date {
    return this._createdAt
  }

  /**
   * 獲取更新時間
   */
  get updatedAt(): Date {
    return this._updatedAt
  }

  /**
   * 檢查訂單是否為 Pending
   */
  isPending(): boolean {
    return this._status?.isPending() ?? false
  }

  /**
   * 檢查訂單是否為 Confirmed
   */
  isConfirmed(): boolean {
    return this.props.status.isConfirmed()
  }

  /**
   * 檢查訂單是否為 Shipped
   */
  isShipped(): boolean {
    return this.props.status.isShipped()
  }

  /**
   * 檢查訂單是否為 Cancelled
   */
  isCancelled(): boolean {
    return this.props.status.isCancelled()
  }
}
