import { describe, it, expect, beforeEach } from 'bun:test'
import { Order } from '@/Modules/Order/Domain/Aggregates/Order'
import { OrderLine } from '@/Modules/Order/Domain/Aggregates/OrderLine'
import { OrderId } from '@/Modules/Order/Domain/ValueObjects/OrderId'
import { OrderStatus, OrderStatusEnum } from '@/Modules/Order/Domain/ValueObjects/OrderStatus'
import { Money } from '@/Modules/Order/Domain/ValueObjects/Money'
import { OrderTotal } from '@/Modules/Order/Domain/ValueObjects/OrderTotal'

/**
 * E2E Order Flow Tests
 * 測試完整的訂單生命週期
 */
describe('Order E2E Flow', () => {
  function createOrder(userId: string, items: Array<{ productId: string; name: string; qty: number; price: number }>): Order {
    const lines = items.map((item) =>
      OrderLine.create(item.productId, item.name, item.qty, Money.create(item.price)),
    )
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal.amount, 0)
    const total = OrderTotal.create(Money.create(subtotal), 0)
    return Order.create(userId, lines, total)
  }

  describe('Complete Order Lifecycle', () => {
    it('應該經歷完整訂單流: Pending → Confirmed → Shipped', () => {
      // 1. 建立訂單
      const order = createOrder('user-123', [
        { productId: 'prod-1', name: '筆電', qty: 1, price: 10000 },
        { productId: 'prod-2', name: '滑鼠', qty: 2, price: 500 },
      ])

      expect(order.status.isPending()).toBe(true)
      expect(order.lines.length).toBe(2)
      expect(order.total.total.amount).toBe(11000)

      // 2. 確認訂單
      order.confirm()
      expect(order.status.isConfirmed()).toBe(true)

      // 3. 發貨
      order.ship('EXPRESS-12345')
      expect(order.status.isShipped()).toBe(true)

      // 驗證事件發佈
      const events = order.getUncommittedEvents()
      expect(events.length).toBe(3) // OrderPlaced, OrderConfirmed, OrderShipped
    })

    it('應該支持中途取消: Pending → Cancelled', () => {
      const order = createOrder('user-456', [
        { productId: 'prod-3', name: '鍵盤', qty: 1, price: 2000 },
      ])

      expect(order.isPending()).toBe(true)

      order.cancel('客戶要求取消')

      expect(order.isCancelled()).toBe(true)
      expect(order.total.total.amount).toBe(2000)

      const events = order.getUncommittedEvents()
      const cancelEvent = events[events.length - 1] as any
      expect(cancelEvent.eventType).toBe('OrderCancelled')
    })

    it('應該支持確認後取消: Confirmed → Cancelled', () => {
      const order = createOrder('user-789', [
        { productId: 'prod-4', name: '螢幕', qty: 1, price: 5000 },
      ])

      order.confirm()
      expect(order.isConfirmed()).toBe(true)

      order.cancel('出貨延誤，客戶改其他廠商')

      expect(order.isCancelled()).toBe(true)

      const events = order.getUncommittedEvents()
      expect(events.some((e) => e.getEventName() === 'OrderCancelled')).toBe(true)
    })

    it('應該防止無效轉換: Shipped 無法取消', () => {
      const order = createOrder('user-abc', [
        { productId: 'prod-5', name: '充電器', qty: 1, price: 500 },
      ])

      order.confirm()
      order.ship('TRACK-999')

      expect(order.isShipped()).toBe(true)

      // 應該拋出錯誤
      expect(() => order.cancel('太遲了')).toThrow('已發貨的訂單無法取消')
    })
  })

  describe('Complex Scenarios', () => {
    it('應該支持大量訂單項目', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        productId: `prod-${i + 1}`,
        name: `商品 ${i + 1}`,
        qty: 1 + (i % 5),
        price: 100 + i * 10,
      }))

      const order = createOrder('user-bulk', items)

      expect(order.lines.length).toBe(20)
      expect(order.total.total.amount).toBeGreaterThan(0)

      // 驗證所有行項目
      order.lines.forEach((line, i) => {
        expect(line.productId).toBe(`prod-${i + 1}`)
        expect(line.quantity).toBe(1 + (i % 5))
      })
    })

    it('應該支持高額訂單', () => {
      const order = createOrder('user-vip', [
        { productId: 'prod-luxury', name: '豪華商品', qty: 1, price: 1000000 },
      ])

      expect(order.total.total.amount).toBe(1000000)

      order.confirm()
      order.ship('LUXURY-EXPRESS')

      expect(order.isShipped()).toBe(true)
    })

    it('應該正確處理多次狀態查詢', () => {
      const order = createOrder('user-check', [
        { productId: 'prod-x', name: '測試商品', qty: 1, price: 999 },
      ])

      // 重複查詢狀態應該返回相同結果
      for (let i = 0; i < 10; i++) {
        expect(order.isPending()).toBe(true)
        expect(order.isConfirmed()).toBe(false)
        expect(order.isShipped()).toBe(false)
        expect(order.isCancelled()).toBe(false)
      }

      order.confirm()

      for (let i = 0; i < 10; i++) {
        expect(order.isPending()).toBe(false)
        expect(order.isConfirmed()).toBe(true)
        expect(order.isShipped()).toBe(false)
        expect(order.isCancelled()).toBe(false)
      }
    })
  })

  describe('Data Integrity', () => {
    it('應該在訂單生命週期中維持數據完整性', () => {
      const initialOrder = createOrder('user-integrity', [
        { productId: 'prod-a', name: 'Item A', qty: 2, price: 100 },
        { productId: 'prod-b', name: 'Item B', qty: 3, price: 200 },
      ])

      const originalTotal = initialOrder.total.total.amount
      const originalLineCount = initialOrder.lines.length
      const originalUserId = initialOrder.userId

      // 經過多個狀態轉換
      initialOrder.confirm()
      initialOrder.ship('TRACK-123')

      // 驗證數據未改變
      expect(initialOrder.total.total.amount).toBe(originalTotal)
      expect(initialOrder.lines.length).toBe(originalLineCount)
      expect(initialOrder.userId).toBe(originalUserId)

      // 驗證訂單行項目數據完整
      initialOrder.lines.forEach((line) => {
        expect(line.productId).toBeDefined()
        expect(line.productName).toBeDefined()
        expect(line.quantity).toBeGreaterThan(0)
        expect(line.unitPrice.amount).toBeGreaterThan(0)
      })
    })

    it('應該維持時間戳順序', () => {
      const order = createOrder('user-time', [
        { productId: 'prod-t', name: 'Time Test', qty: 1, price: 100 },
      ])

      const createdAt = order.createdAt.getTime()
      let lastUpdatedAt = order.updatedAt.getTime()

      order.confirm()
      const confirmedAt = order.updatedAt.getTime()

      expect(confirmedAt).toBeGreaterThanOrEqual(lastUpdatedAt)
      expect(createdAt).toBeLessThanOrEqual(confirmedAt)

      lastUpdatedAt = confirmedAt

      order.ship()
      const shippedAt = order.updatedAt.getTime()

      expect(shippedAt).toBeGreaterThanOrEqual(lastUpdatedAt)
    })
  })

  describe('Event Consistency', () => {
    it('應該按正確順序發佈事件', () => {
      const order = createOrder('user-events', [
        { productId: 'prod-e', name: 'Event Test', qty: 1, price: 100 },
      ])

      let events = order.getUncommittedEvents()
      expect((events[0] as any).eventType).toBe('OrderPlaced')

      order.confirm()
      events = order.getUncommittedEvents()
      expect(events.some((e) => (e as any).eventType === 'OrderConfirmed')).toBe(true)

      order.ship()
      events = order.getUncommittedEvents()
      expect(events.some((e) => (e as any).eventType === 'OrderShipped')).toBe(true)
    })

    it('應該在取消時發佈事件', () => {
      const order = createOrder('user-cancel-event', [
        { productId: 'prod-c', name: 'Cancel Event', qty: 1, price: 100 },
      ])

      order.cancel('測試取消')

      const events = order.getUncommittedEvents()
      expect(events.some((e) => (e as any).eventType === 'OrderCancelled')).toBe(true)
    })
  })

  describe('Error Scenarios', () => {
    it('應該拒絕無效的狀態轉換', () => {
      const order = createOrder('user-error', [
        { productId: 'prod-err', name: 'Error Test', qty: 1, price: 100 },
      ])

      // 嘗試兩次確認
      order.confirm()
      expect(() => order.confirm()).toThrow('只能確認 Pending 狀態的訂單')

      // 嘗試在未確認時發貨
      const order2 = createOrder('user-error2', [
        { productId: 'prod-err2', name: 'Error Test 2', qty: 1, price: 100 },
      ])
      expect(() => order2.ship()).toThrow('只能發貨已確認的訂單')
    })

    it('應該拒絕已發貨訂單的操作', () => {
      const order = createOrder('user-shipped', [
        { productId: 'prod-shipped', name: 'Shipped Test', qty: 1, price: 100 },
      ])

      order.confirm()
      order.ship()

      expect(() => order.cancel('遺憾的')).toThrow('已發貨的訂單無法取消')
      expect(() => order.ship()).toThrow('已確認的訂單')
    })
  })
})
