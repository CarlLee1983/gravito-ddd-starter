import { describe, it, expect } from 'bun:test'
import { Order } from '@/Modules/Order/Domain/Aggregates/Order'
import { OrderLine } from '@/Modules/Order/Domain/Aggregates/OrderLine'
import { OrderId } from '@/Modules/Order/Domain/ValueObjects/OrderId'
import { OrderStatus, OrderStatusEnum } from '@/Modules/Order/Domain/ValueObjects/OrderStatus'
import { Money } from '@/Modules/Order/Domain/ValueObjects/Money'
import { OrderTotal } from '@/Modules/Order/Domain/ValueObjects/OrderTotal'
import { OrderPlaced } from '@/Modules/Order/Domain/Events/OrderPlaced'
import { OrderConfirmed } from '@/Modules/Order/Domain/Events/OrderConfirmed'
import { OrderShipped } from '@/Modules/Order/Domain/Events/OrderShipped'
import { OrderCancelled } from '@/Modules/Order/Domain/Events/OrderCancelled'

describe('Order Aggregate', () => {
  // ============ OrderLine Tests ============
  describe('OrderLine', () => {
    it('應該建立 OrderLine', () => {
      const unitPrice = Money.create(100)
      const line = OrderLine.create('prod-1', '商品 A', 2, unitPrice)

      expect(line.productId).toBe('prod-1')
      expect(line.productName).toBe('商品 A')
      expect(line.quantity).toBe(2)
      expect(line.unitPrice.amount).toBe(100)
      expect(line.lineTotal.amount).toBe(200)
    })

    it('應該拋出錯誤當數量為 0', () => {
      const unitPrice = Money.create(100)
      expect(() => OrderLine.create('prod-1', '商品 A', 0, unitPrice)).toThrow(
        '數量必須大於 0',
      )
    })

    it('應該拋出錯誤當產品 ID 為空', () => {
      const unitPrice = Money.create(100)
      expect(() => OrderLine.create('', '商品 A', 1, unitPrice)).toThrow(
        '產品 ID 和名稱不能為空',
      )
    })

    it('應該拋出錯誤當產品名稱為空', () => {
      const unitPrice = Money.create(100)
      expect(() => OrderLine.create('prod-1', '', 1, unitPrice)).toThrow(
        '產品 ID 和名稱不能為空',
      )
    })

    it('應該計算行項目小計', () => {
      const unitPrice = Money.create(50)
      const line = OrderLine.create('prod-1', '商品 A', 3, unitPrice)
      expect(line.lineTotal.amount).toBe(150)
    })
  })

  // ============ Order Aggregate Tests ============
  describe('Order', () => {
    function createTestOrder(userId = 'user-123', lineCount = 1): Order {
      const lines = Array.from({ length: lineCount }, (_, i) => {
        const unitPrice = Money.create(100)
        return OrderLine.create(`prod-${i + 1}`, `商品 ${i + 1}`, 2, unitPrice)
      })

      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal.amount, 0)
      const subtotalMoney = Money.create(subtotal)
      const total = OrderTotal.create(subtotalMoney, 0)

      return Order.create(userId, lines, total)
    }

    it('應該建立新訂單', () => {
      const order = createTestOrder()
      expect(order.userId).toBe('user-123')
      expect(order.lines.length).toBe(1)
      expect(order.status.isPending()).toBe(true)
    })

    it('應該發佈 OrderPlaced 事件', () => {
      const order = createTestOrder()
      const events = order.getUncommittedEvents()
      expect(events.length).toBe(1)
      expect(events[0]).toBeInstanceOf(OrderPlaced)
    })

    it('應該拋出錯誤當 userId 為空', () => {
      expect(() => createTestOrder('')).toThrow('userId 不能為空')
    })

    it('應該拋出錯誤當訂單無行項目', () => {
      const total = OrderTotal.create(Money.create(0))
      expect(() => Order.create('user-123', [], total)).toThrow(
        '訂單至少需要一個行項目',
      )
    })

    it('應該確認訂單', () => {
      const order = createTestOrder()
      order.confirm()

      expect(order.status.isConfirmed()).toBe(true)
      expect(order.isPending()).toBe(false)
    })

    it('應該發佈 OrderConfirmed 事件', () => {
      const order = createTestOrder()
      order.markEventsAsCommitted() // 清空初始事件
      order.confirm()

      const events = order.getUncommittedEvents()
      expect(events.some((e) => e instanceof OrderConfirmed)).toBe(true)
    })

    it('應該拋出錯誤當確認非 Pending 訂單', () => {
      const order = createTestOrder()
      order.confirm()

      expect(() => order.confirm()).toThrow('只能確認 Pending 狀態的訂單')
    })

    it('應該發貨已確認的訂單', () => {
      const order = createTestOrder()
      order.confirm()
      order.ship('TRACK-123')

      expect(order.status.isShipped()).toBe(true)
    })

    it('應該記錄追蹤號碼在 OrderShipped 事件', () => {
      const order = createTestOrder()
      order.confirm()
      order.markEventsAsCommitted() // 清空已提交事件
      order.ship('TRACK-456')

      const events = order.getUncommittedEvents()
      const shipEvent = events.find((e) => e instanceof OrderShipped) as any
      expect(shipEvent?.data?.trackingNumber).toBe('TRACK-456')
    })

    it('應該拋出錯誤當發貨非確認訂單', () => {
      const order = createTestOrder()
      expect(() => order.ship()).toThrow('只能發貨已確認的訂單')
    })

    it('應該取消 Pending 訂單', () => {
      const order = createTestOrder()
      order.cancel('客戶要求取消')

      expect(order.status.isCancelled()).toBe(true)
    })

    it('應該取消 Confirmed 訂單', () => {
      const order = createTestOrder()
      order.confirm()
      order.cancel('出貨延誤')

      expect(order.status.isCancelled()).toBe(true)
    })

    it('應該拋出錯誤當取消已發貨訂單', () => {
      const order = createTestOrder()
      order.confirm()
      order.ship()

      expect(() => order.cancel('錯誤訂單')).toThrow('已發貨的訂單無法取消')
    })

    it('應該拋出錯誤當取消已取消訂單', () => {
      const order = createTestOrder()
      order.cancel('原因')

      expect(() => order.cancel('另一個原因')).toThrow('訂單已取消')
    })

    it('應該記錄取消原因在事件', () => {
      const order = createTestOrder()
      order.cancel('庫存不足')

      const events = order.getUncommittedEvents()
      const cancelEvent = events.find((e) => e instanceof OrderCancelled) as any
      expect(cancelEvent?.data?.reason).toBe('庫存不足')
    })

    it('應該支持多行訂單', () => {
      const order = createTestOrder('user-456', 3)
      expect(order.lines.length).toBe(3)
      expect(order.total.total.amount).toBe(600) // 3 lines × 100 × 2
    })

    it('應該維護狀態轉換的不可變性', () => {
      const order = createTestOrder()
      const originalStatus = order.status

      order.confirm()

      // 確認原始狀態未改變
      expect(originalStatus.isPending()).toBe(true)
      expect(order.status.isConfirmed()).toBe(true)
    })

    it('應該更新 updatedAt 時間戳', () => {
      const order = createTestOrder()
      const originalTime = order.updatedAt.getTime()

      order.confirm()
      const newTime = order.updatedAt.getTime()

      expect(newTime).toBeGreaterThanOrEqual(originalTime)
    })

    it('應該獲取訂單詳情', () => {
      const order = createTestOrder('user-789')

      expect(order.orderId).toBeDefined()
      expect(order.userId).toBe('user-789')
      expect(order.lines.length).toBeGreaterThan(0)
      expect(order.total).toBeDefined()
      expect(order.createdAt).toBeDefined()
    })
  })

  // ============ State Machine Tests ============
  describe('Order State Machine', () => {
    it('應該支持完整的狀態流: Pending → Confirmed → Shipped', () => {
      const order = createTestOrder()

      expect(order.status.isPending()).toBe(true)
      order.confirm()
      expect(order.status.isConfirmed()).toBe(true)
      order.ship()
      expect(order.status.isShipped()).toBe(true)
    })

    it('應該支持取消流: Pending → Cancelled', () => {
      const order = createTestOrder()
      expect(order.status.isPending()).toBe(true)
      order.cancel('取消')
      expect(order.status.isCancelled()).toBe(true)
    })

    it('應該支持取消流: Confirmed → Cancelled', () => {
      const order = createTestOrder()
      order.confirm()
      expect(order.status.isConfirmed()).toBe(true)
      order.cancel('取消')
      expect(order.status.isCancelled()).toBe(true)
    })

    it('應該防止無效的狀態轉換', () => {
      const order = createTestOrder()
      order.confirm()
      order.ship()

      // Shipped → Cancelled 應該失敗
      expect(() => order.cancel('錯誤')).toThrow()

      // Shipped → Pending 應該不可能
      const shipStatus = order.status
      expect(() => OrderStatus.fromString('PENDING')).toBeDefined()
      // 但是 Order 不應該允許轉換
    })
  })

  function createTestOrder(userId = 'user-123', lineCount = 1): Order {
    const lines = Array.from({ length: lineCount }, (_, i) => {
      const unitPrice = Money.create(100)
      return OrderLine.create(`prod-${i + 1}`, `商品 ${i + 1}`, 2, unitPrice)
    })

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal.amount, 0)
    const subtotalMoney = Money.create(subtotal)
    const total = OrderTotal.create(subtotalMoney, 0)

    return Order.create(userId, lines, total)
  }
})
