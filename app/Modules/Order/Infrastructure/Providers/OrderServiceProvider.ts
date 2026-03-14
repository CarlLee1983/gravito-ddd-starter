/**
 * @file OrderServiceProvider.ts
 * @description Order 模組服務提供者 (Service Provider)
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { PlaceOrderService } from '../../Application/Services/PlaceOrderService'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import { getRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'

/**
 * Order 模組服務提供者
 * 
 * 負責在 IoC 容器中註冊 Order 模組所需的各種服務、倉儲，
 * 並在模組啟動 (boot) 時監聽跨模組事件，如購物車結帳與支付完成。
 */
export class OrderServiceProvider extends ModuleServiceProvider {
  /**
   * 註冊服務到 IoC 容器
   * 
   * 註冊項目包括：
   * - orderRepository: 訂單倉儲單例
   * - placeOrderService: 建立訂單應用服務
   * 
   * @param container - IoC 容器實例
   */
  override register(container: IContainer): void {
    // 註冊 Repository 為單例
    container.singleton('orderRepository', () => {
      const registry = getRegistry()
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return registry.create('order', orm, db)
    })

    // 註冊應用層服務
    container.singleton('placeOrderService', (c: IContainer) => {
      const orderRepository = c.make('orderRepository') as IOrderRepository
      return new PlaceOrderService(orderRepository)
    })
  }

  /**
   * 啟動模組並註冊跨模組事件監聽
   * 
   * 主要監聽事件：
   * - CartCheckoutRequested: 當購物車請求結帳時，觸發建立訂單流程
   * - PaymentCompleted: 當支付成功後，更新對應訂單狀態為已確認 (Confirmed)
   * 
   * @param context - 模組執行上下文
   */
  override boot(context: any): void {
    const container = context.container
    const eventDispatcher = container.make('eventDispatcher') as IEventDispatcher

    // 監聽購物車結帳事件並建立訂單
    eventDispatcher.subscribe('CartCheckoutRequested', async (event: any) => {
      const placeOrderService = container.make('placeOrderService') as PlaceOrderService
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
      const orderRepository = container.make('orderRepository') as IOrderRepository
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

    console.log('📦 [Order] Module loaded')
  }
}
