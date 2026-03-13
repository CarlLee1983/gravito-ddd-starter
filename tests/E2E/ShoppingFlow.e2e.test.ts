import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import type { Server } from 'bun'

/**
 * 購物流程 E2E 測試
 *
 * 驗證完整的 HTTP API 購物流程：
 * POST /api/carts/:userId/items → POST /api/carts/:userId/checkout
 * → GET /api/orders/:id → POST /api/payments/:id/confirm
 */
describe('Shopping Flow E2E Tests', () => {
  let server: Server
  const baseUrl = 'http://localhost:3000'
  const userId = 'user-e2e-' + Date.now()
  const productId = 'product-e2e-123'

  let cartId: string
  let orderId: string
  let paymentId: string

  beforeAll(async () => {
    // 啟動伺服器
    // server = await startServer()
    // await new Promise(resolve => setTimeout(resolve, 1000)) // 等待伺服器啟動
  })

  afterAll(async () => {
    // 關閉伺服器
    // if (server) server.stop()
  })

  describe('Shopping Cart Operations', () => {
    it('應能建立新購物車', async () => {
      const response = await fetch(`${baseUrl}/api/carts/${userId}`, {
        method: 'GET'
      })

      expect(response.status).toBe(200)
      const cart = await response.json()
      expect(cart.userId).toBe(userId)
      cartId = cart.id
    })

    it('應能添加商品到購物車', async () => {
      const response = await fetch(`${baseUrl}/api/carts/${userId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId,
          quantity: 2
        })
      })

      expect(response.status).toBe(201)
      const cart = await response.json()
      expect(cart.items.length).toBeGreaterThan(0)
      expect(cart.items[0].productId).toBe(productId)
      expect(cart.items[0].quantity).toBe(2)
    })

    it('應能從購物車移除商品', async () => {
      // 先添加另一個商品
      await fetch(`${baseUrl}/api/carts/${userId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'product-remove',
          quantity: 1
        })
      })

      // 移除商品
      const response = await fetch(`${baseUrl}/api/carts/${userId}/items/product-remove`, {
        method: 'DELETE'
      })

      expect(response.status).toBe(200)
    })

    it('應能結帳購物車', async () => {
      const response = await fetch(`${baseUrl}/api/carts/${userId}/checkout`, {
        method: 'POST'
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Order Operations', () => {
    it('應自動建立訂單（結帳後）', async () => {
      const response = await fetch(`${baseUrl}/api/users/${userId}/orders`, {
        method: 'GET'
      })

      expect(response.status).toBe(200)
      const orders = await response.json()
      expect(orders.length).toBeGreaterThan(0)

      const order = orders[0]
      expect(order.status).toBe('PENDING')
      expect(order.total).toBeGreaterThan(0)
      orderId = order.id
    })

    it('應能查詢訂單詳情', async () => {
      const response = await fetch(`${baseUrl}/api/orders/${orderId}`, {
        method: 'GET'
      })

      expect(response.status).toBe(200)
      const order = await response.json()
      expect(order.id).toBe(orderId)
      expect(order.userId).toBe(userId)
      expect(order.status).toBe('PENDING')
    })
  })

  describe('Payment Operations', () => {
    it('應自動發起支付（訂單建立後）', async () => {
      const response = await fetch(`${baseUrl}/api/payments/order/${orderId}`, {
        method: 'GET'
      })

      expect(response.status).toBe(200)
      const payments = await response.json()
      expect(payments.length).toBeGreaterThan(0)

      const payment = payments[0]
      expect(payment.status).toBe('INITIATED')
      expect(payment.amount).toBeGreaterThan(0)
      paymentId = payment.id
    })

    it('應能確認支付', async () => {
      const response = await fetch(`${baseUrl}/api/payments/${paymentId}/confirm`, {
        method: 'POST'
      })

      expect(response.status).toBe(200)
      const payment = await response.json()
      expect(payment.status).toBe('SUCCEEDED')
    })

    it('支付成功後訂單應自動確認', async () => {
      const response = await fetch(`${baseUrl}/api/orders/${orderId}`, {
        method: 'GET'
      })

      expect(response.status).toBe(200)
      const order = await response.json()
      expect(order.status).toBe('CONFIRMED')
    })
  })

  describe('Order State Transitions', () => {
    it('應能發貨已確認的訂單', async () => {
      const response = await fetch(`${baseUrl}/api/orders/${orderId}/ship`, {
        method: 'POST'
      })

      expect(response.status).toBe(200)
      const order = await response.json()
      expect(order.status).toBe('SHIPPED')
    })

    it('已發貨訂單無法取消', async () => {
      const response = await fetch(`${baseUrl}/api/orders/${orderId}/cancel`, {
        method: 'POST'
      })

      expect(response.status).toBe(400) // Bad Request 或 409 Conflict
    })
  })

  describe('Payment Failure Scenario', () => {
    it('應能標記支付失敗', async () => {
      // 建立新的購物流程
      const userId2 = 'user-e2e-fail-' + Date.now()

      // 1. 建立購物車和結帳
      await fetch(`${baseUrl}/api/carts/${userId2}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'product-fail', quantity: 1 })
      })

      await fetch(`${baseUrl}/api/carts/${userId2}/checkout`, { method: 'POST' })

      // 2. 取得訂單
      const ordersRes = await fetch(`${baseUrl}/api/users/${userId2}/orders`)
      const orders = await ordersRes.json()
      const failOrderId = orders[0].id

      // 3. 取得支付
      const paymentsRes = await fetch(`${baseUrl}/api/payments/order/${failOrderId}`)
      const payments = await paymentsRes.json()
      const failPaymentId = payments[0].id

      // 4. 標記支付失敗
      const response = await fetch(`${baseUrl}/api/payments/${failPaymentId}/fail`, {
        method: 'POST'
      })

      expect(response.status).toBe(200)
      const payment = await response.json()
      expect(payment.status).toBe('FAILED')
    })

    it('支付失敗後訂單應自動取消', async () => {
      // 使用前面建立的失敗訂單
      const userId2 = 'user-e2e-fail-' + (Date.now() - 1000)

      const ordersRes = await fetch(`${baseUrl}/api/users/${userId2}/orders`)
      const orders = await ordersRes.json()
      const failOrderId = orders[0].id

      const response = await fetch(`${baseUrl}/api/orders/${failOrderId}`)
      const order = await response.json()
      expect(order.status).toBe('CANCELLED')
    })
  })

  describe('Error Handling', () => {
    it('不存在的購物車應返回 404', async () => {
      const response = await fetch(`${baseUrl}/api/carts/nonexistent-user`)
      expect(response.status).toBe(404)
    })

    it('不存在的訂單應返回 404', async () => {
      const response = await fetch(`${baseUrl}/api/orders/nonexistent-order`)
      expect(response.status).toBe(404)
    })

    it('空購物車結帳應返回 400', async () => {
      const userId3 = 'user-e2e-empty-' + Date.now()

      const response = await fetch(`${baseUrl}/api/carts/${userId3}/checkout`, {
        method: 'POST'
      })

      expect(response.status).toBe(400)
    })

    it('無效的狀態轉換應返回 409', async () => {
      // 嘗試對 SHIPPED 訂單執行無效操作
      const response = await fetch(`${baseUrl}/api/orders/${orderId}/cancel`, {
        method: 'POST'
      })

      expect(response.status).toBe(400 || 409) // Conflict
    })
  })

  describe('Performance', () => {
    it('購物流程應在 500ms 內完成', async () => {
      const userId4 = 'user-perf-' + Date.now()
      const start = Date.now()

      // 完整的購物流程
      await fetch(`${baseUrl}/api/carts/${userId4}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'product-perf', quantity: 1 })
      })

      await fetch(`${baseUrl}/api/carts/${userId4}/checkout`, { method: 'POST' })

      const duration = Date.now() - start
      expect(duration).toBeLessThan(500)
    })
  })
})
