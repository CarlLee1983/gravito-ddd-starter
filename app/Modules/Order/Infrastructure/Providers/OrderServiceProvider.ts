import { IServiceProvider } from '@gravito/core'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { OrderRepository } from '../Repositories/OrderRepository'
import { PlaceOrderService } from '../../Application/Services/PlaceOrderService'

/**
 * OrderServiceProvider - 依賴注入容器配置
 */
export class OrderServiceProvider implements IServiceProvider {
  /**
   * 註冊 Repository 實現
   * 此處綁定 Domain 介面到 Infrastructure 實現
   */
  registerRepositories(core: any): void {
    const db = core.container.make('database')
    const eventDispatcher = core.container.make('eventDispatcher')

    core.container.singleton('orderRepository', () => {
      return new OrderRepository(db, eventDispatcher)
    })
  }

  /**
   * 註冊應用層服務
   */
  registerServices(core: any): void {
    core.container.singleton('placeOrderService', (c: any) => {
      const orderRepository = c.make('orderRepository') as IOrderRepository
      return new PlaceOrderService(orderRepository)
    })
  }

  /**
   * 註冊 Event Listeners（監聽其他模組事件）
   * 範例：監聽 Cart 模組的 CartCheckoutRequested 事件
   */
  registerEventListeners(core: any): void {
    const eventDispatcher = core.container.make('eventDispatcher')

    // 監聽購物車結帳事件並建立訂單
    eventDispatcher.subscribe('CartCheckoutRequested', async (event: any) => {
      const placeOrderService = core.container.make('placeOrderService')
      try {
        await placeOrderService.execute({
          userId: event.userId,
          lines: event.items,
          taxAmount: event.taxAmount || 0,
        })
      } catch (error) {
        console.error('建立訂單失敗:', error)
      }
    })

    // 監聽支付完成事件並更新訂單為 Confirmed
    eventDispatcher.subscribe('PaymentCompleted', async (event: any) => {
      const orderRepository = core.container.make('orderRepository') as IOrderRepository
      try {
        const order = await orderRepository.findById(event.orderId)
        if (order) {
          order.confirm()
          await orderRepository.update(order)
        }
      } catch (error) {
        console.error('更新訂單狀態失敗:', error)
      }
    })
  }
}
