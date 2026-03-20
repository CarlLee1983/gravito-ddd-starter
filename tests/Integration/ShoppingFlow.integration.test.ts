import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import type { Core } from '@gravito/core'
import { bootstrap } from '../../app/bootstrap'

// 預先配置 memory ORM 用於整合測試
process.env.ORM = 'memory'

/**
 * 購物流程集成測試
 *
 * 驗證完整的跨模組事件流：
 * Cart.checkout() → Order.place() → Payment.initiate() → Payment.succeed() → Order.confirm()
 */
describe('Shopping Flow Integration Tests', () => {
  let core: Core
  let cartRepository: any
  let orderRepository: any
  let paymentRepository: any
  let eventDispatcher: any
  let db: any
  let testCounter = 0

  beforeAll(async () => {
    // 啟動應用（ORM 已配置為 memory）
    core = await bootstrap()

    // 取得依賴
    cartRepository = core.container.make('cartRepository')
    orderRepository = core.container.make('orderRepository')
    paymentRepository = core.container.make('paymentRepository')
    eventDispatcher = core.container.make('eventDispatcher')
    db = core.container.make('databaseAccess')
  })

  beforeEach(async () => {
    // 為每個測試使用唯一的 ID，避免數據污染
    testCounter++

    // 清理每個測試前的數據
    if (db) {
      try {
        await db.table('carts').delete()
        await db.table('orders').delete()
        await db.table('payments').delete()
      } catch (e) {
        // 表可能不存在，忽略
      }
    }
  })

  afterAll(async () => {
    // 清理資源
    if (core) {
      // await core.shutdown()
    }
  })

  describe('Complete Shopping Journey', () => {
    it('應該完成完整的購物流程: 建立購物車 → 結帳 → 建立訂單 → 發起支付 → 確認訂單', async () => {
      const userId = `user-${testCounter}-123`
      const productId = 'product-456'

      // 1️⃣ 建立購物車並添加商品
      const cart = await cartRepository.findOrCreateByUserId(userId)
      expect(cart).toBeDefined()
      expect(cart.userId).toBe(userId)

      // 2️⃣ 添加商品到購物車
      cart.addItem(productId, 2, 50000)
      await cartRepository.save(cart)

      // 3️⃣ 結帳 - 發佈 CartCheckoutRequested 事件
      cart.checkout()

      // 驗證 CartCheckoutRequested 事件已發佈（必須在 save() 前檢查，save() 會清除事件）
      let cartEvents = cart.getUncommittedEvents()
      expect(cartEvents.some((e: any) => e.constructor.name === 'CartCheckoutRequested')).toBe(true)

      await cartRepository.save(cart)

      // 4️⃣ 監聽 CartCheckoutRequested 事件，自動建立訂單
      // (由 CartCheckoutRequestedHandler 自動處理)
      await new Promise(resolve => setTimeout(resolve, 100)) // 等待事件處理

      // 驗證訂單已自動建立
      const orders = await orderRepository.findByUserId(userId)
      expect(orders.length).toBeGreaterThan(0)

      const order = orders[0]
      expect(order.status.value).toBe('PENDING')
      expect(order.total.total.amount).toBe(100000) // 2 * 50000

      // 5️⃣ OrderPlaced 事件已發佈（通過成功建立訂單驗證）
      // 注意：從 repository 載入的聚合根已提交事件，getUncommittedEvents() 為空
      // 所以直接驗證訂單狀態即可

      // 6️⃣ 監聽 OrderPlaced 事件，自動發起支付
      // (由 OrderPlacedHandler 自動處理)
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證支付已自動發起
      const payments = await paymentRepository.findByOrderId(order.id)
      expect(payments.length).toBeGreaterThan(0)

      const payment = payments[0]
      expect(payment.status.value).toBe('INITIATED')
      expect(payment.amount.cents).toBe(100000)

      // 7️⃣ 支付成功
      const { TransactionId } = await import('../../app/Modules/Payment/Domain/ValueObjects/TransactionId')
      payment.succeed(TransactionId.from(`txn-${order.id}`))

      // 驗證 PaymentSucceeded 事件已發佈（必須在 save() 前檢查）
      let paymentEvents = payment.getUncommittedEvents()
      expect(paymentEvents.some((e: any) => e.constructor.name === 'PaymentSucceeded')).toBe(true)

      await paymentRepository.save(payment)

      // 8️⃣ 監聽 PaymentSucceeded 事件，自動確認訂單
      // (由 PaymentSucceededHandler 自動處理)
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證訂單已自動確認
      const confirmedOrder = await orderRepository.findById(order.id)
      expect(confirmedOrder.status.value).toBe('CONFIRMED')
    })
  })

  describe('Failure Scenarios', () => {
    it('支付失敗時應自動取消訂單', async () => {
      const userId = `user-${testCounter}-789`
      const productId = 'product-101'

      // 1️⃣ 完成購物車結帳
      const cart = await cartRepository.findOrCreateByUserId(userId)
      cart.addItem(productId, 1, 50000)
      cart.checkout()
      await cartRepository.save(cart)

      await new Promise(resolve => setTimeout(resolve, 100))

      // 2️⃣ 驗證訂單已建立
      const orders = await orderRepository.findByUserId(userId)
      const order = orders[0]
      expect(order.status.value).toBe('PENDING')

      // 3️⃣ 支付失敗
      const payments = await paymentRepository.findByOrderId(order.id)
      const payment = payments[0]
      payment.fail('Payment declined by processor')

      // 驗證 PaymentFailed 事件已發佈（必須在 save() 前檢查，save() 會清除事件）
      let paymentEvents = payment.getUncommittedEvents()
      expect(paymentEvents.some((e: any) => e.constructor.name === 'PaymentFailed')).toBe(true)

      await paymentRepository.save(payment)

      // 4️⃣ 監聽 PaymentFailed 事件，自動取消訂單
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證訂單已自動取消
      const cancelledOrder = await orderRepository.findById(order.id)
      expect(cancelledOrder.status.value).toBe('CANCELLED')
    })

    it('應防止已發貨訂單被取消', async () => {
      const userId = `user-${testCounter}-999`
      const productId = 'product-202'

      // 建立並確認訂單
      const cart = await cartRepository.findOrCreateByUserId(userId)
      cart.addItem(productId, 1, 50000)
      cart.checkout()
      await cartRepository.save(cart)

      await new Promise(resolve => setTimeout(resolve, 100))

      const orders = await orderRepository.findByUserId(userId)
      const order = orders[0]

      // 支付成功
      const payments = await paymentRepository.findByOrderId(order.id)
      const { TransactionId: TxnId } = await import('../../app/Modules/Payment/Domain/ValueObjects/TransactionId')
      payments[0].succeed(TxnId.from(`txn-${order.id}`))
      await paymentRepository.save(payments[0])

      await new Promise(resolve => setTimeout(resolve, 100))

      // 重新取得訂單（確保狀態已更新）
      const confirmedOrder = await orderRepository.findById(order.id)
      expect(confirmedOrder.status.value).toBe('CONFIRMED')

      // 發貨
      confirmedOrder.ship()
      await orderRepository.update(confirmedOrder)

      // 嘗試取消已發貨訂單（應拋出錯誤）
      const shippedOrder = await orderRepository.findById(order.id)
      expect(() => {
        shippedOrder.cancel('已發貨，無法取消')
      }).toThrow()
    })
  })

  describe('Anti-Corruption Layer Verification', () => {
    it('防腐層應正確隔離 Product Context', async () => {
      // 驗證 Cart Domain 層不知道 Product 實現
      const cart = await cartRepository.findOrCreateByUserId('user-acl')

      // 驗證 CartItem 只包含必要的商品資訊
      cart.addItem('product-acl', 1, 50000)
      const items = cart.getItems()

      expect(items[0]).toBeDefined()
      expect(items[0].productId).toBeDefined()
      expect(items[0].quantity.value).toBe(1)  // Quantity 是 Value Object
      expect(items[0].price).toBe(50000)

      // 驗證 CartItem 不包含 Product 的實現細節
      expect((items[0] as any).productName).toBeUndefined() // 應透過 Adapter 取得
      expect((items[0] as any).sku).toBeUndefined()
    })
  })

  describe('Event Sourcing Verification', () => {
    it('應能透過事件重放還原聚合根狀態', async () => {
      const userId = `user-${testCounter}-es`
      const productId = 'product-es'

      // 建立購物車並執行一系列操作
      const originalCart = await cartRepository.findOrCreateByUserId(userId)
      originalCart.addItem(productId, 2, 50000)
      originalCart.addItem('product-es-2', 1, 30000)
      originalCart.removeItem('product-es-2')
      await cartRepository.save(originalCart)

      // 透過事件重放還原購物車
      const reconstructedCart = await cartRepository.findById(originalCart.id)

      // 驗證還原的購物車與原始購物車狀態相同
      expect(reconstructedCart.getItems().length).toBe(originalCart.getItems().length)
      expect(reconstructedCart.userId).toBe(originalCart.userId)

      // 驗證購物車項目內容
      const originalItems = originalCart.getItems()
      const reconstructedItems = reconstructedCart.getItems()
      for (let i = 0; i < originalItems.length; i++) {
        expect(reconstructedItems[i].productId).toBe(originalItems[i].productId)
        expect(reconstructedItems[i].quantity.value).toBe(originalItems[i].quantity.value)
      }
    })
  })

  describe('Cross-Module Event Flow', () => {
    it('應能正確發佈和監聽 IntegrationEvents', async () => {
      const userId = `user-${testCounter}-events`
      const productId = 'product-events'

      // 監聽事件
      let cartCheckoutRequestedFired = false
      let orderPlacedFired = false
      let paymentInitiatedFired = false

      eventDispatcher.on('CartCheckoutRequested', () => {
        cartCheckoutRequestedFired = true
      })
      eventDispatcher.on('OrderPlaced', () => {
        orderPlacedFired = true
      })
      eventDispatcher.on('PaymentInitiated', () => {
        paymentInitiatedFired = true
      })

      // 執行購物流程
      const cart = await cartRepository.findOrCreateByUserId(userId)
      cart.addItem(productId, 1, 50000)
      cart.checkout()
      await cartRepository.save(cart)

      await new Promise(resolve => setTimeout(resolve, 200))

      // 驗證事件已發佈
      expect(cartCheckoutRequestedFired).toBe(true)
      expect(orderPlacedFired).toBe(true)
      expect(paymentInitiatedFired).toBe(true)
    })
  })

  describe('Business Rules Enforcement', () => {
    it('購物車最多 50 種商品', async () => {
      const userId = `user-${testCounter}-rules-1`
      const cart = await cartRepository.findOrCreateByUserId(userId)

      // 添加 50 種商品（達到上限）
      for (let i = 0; i < 50; i++) {
        cart.addItem(`product-${i}`, 1, 10000)
      }

      expect(cart.getItems().length).toBe(50)

      // 嘗試添加第 51 種商品（應拋出錯誤）
      expect(() => {
        cart.addItem('product-51', 1, 10000)
      }).toThrow()
    })

    it('購物車商品數量限制 1-99', async () => {
      const userId = `user-${testCounter}-rules-2`
      const cart = await cartRepository.findOrCreateByUserId(userId)

      // 添加 99 個商品（達到上限）
      cart.addItem('product-limit', 99, 10000)
      expect(cart.getItems()[0].quantity.value).toBe(99)  // Quantity 是 Value Object

      // 嘗試添加 100 個（應拋出錯誤或自動設為 99）
      expect(() => {
        cart.addItem('product-limit', 100, 10000)
      }).toThrow()
    })

    it('空購物車不能結帳', async () => {
      const userId = `user-${testCounter}-rules-3`
      const cart = await cartRepository.findOrCreateByUserId(userId)

      // 嘗試結帳空購物車（應拋出錯誤）
      expect(() => {
        cart.checkout()
      }).toThrow()
    })

    it('訂單狀態轉換規則應被強制執行', async () => {
      const userId = `user-${testCounter}-rules-4`
      const cart = await cartRepository.findOrCreateByUserId(userId)
      cart.addItem('product-rule', 1, 50000)
      cart.checkout()
      await cartRepository.save(cart)

      await new Promise(resolve => setTimeout(resolve, 100))

      const orders = await orderRepository.findByUserId(userId)
      const order = orders[0]

      // Pending 狀態無法直接進入 Shipped
      expect(() => {
        order.ship()
      }).toThrow()

      // 必須先確認
      const payments = await paymentRepository.findByOrderId(order.id)
      const { TransactionId } = await import('../../app/Modules/Payment')
      payments[0].succeed(TransactionId.from(`txn-${order.id}`))
      await paymentRepository.save(payments[0])

      await new Promise(resolve => setTimeout(resolve, 100))

      const confirmedOrder = await orderRepository.findById(order.id)
      // 現在才能發貨
      expect(() => {
        confirmedOrder.ship()
      }).not.toThrow()
    })
  })
})
