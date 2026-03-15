/**
 * @file OrderServiceProvider.ts
 * @description Order 模組服務提供者 (Service Provider)
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { PlaceOrderService } from '../../Application/Services/PlaceOrderService'
import { OrderMessageService } from '../Services/OrderMessageService'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { RepositoryRegistry } from '@wiring/RepositoryRegistry'
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
    container.singleton('orderRepository', (c: IContainer) => {
      const registry = c.make('repositoryRegistry') as RepositoryRegistry
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return registry.create('order', orm, db)
    })

    // 註冊訊息服務（使用工廠方法延遲解析 translator）
    container.singleton('orderMessages', (c) => {
      try {
        const translator = c.make('translator') as ITranslator
        return new OrderMessageService(translator)
      } catch {
        // 如果 translator 還未註冊（啟動期間），使用虛擬實現
        const fallback: any = {
          trans: (key: string) => key,
          choice: (key: string) => key,
          setLocale: () => {},
          getLocale: () => 'en',
        }
        return new OrderMessageService(fallback)
      }
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
   * - PaymentSucceeded: 當支付成功後，更新對應訂單狀態為已確認 (Confirmed)
   *
   * @param context - 模組執行上下文
   */
  override boot(context: any): void {
    const container = context.container ?? context
    const eventDispatcher = container.make('eventDispatcher') as IEventDispatcher
    const logger = container.make('logger') as any

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
        logger?.error?.('[OrderServiceProvider] 建立訂單失敗', error as Error)
      }
    })

    // 監聽支付成功事件並更新訂單為 Confirmed
    eventDispatcher.subscribe('PaymentSucceeded', async (event: any) => {
      const orderRepository = container.make('orderRepository') as IOrderRepository
      try {
        const order = await orderRepository.findById(event.orderId)
        if (order) {
          order.confirm()
          await orderRepository.update(order)
        }
      } catch (error) {
        logger?.error?.('[OrderServiceProvider] 更新訂單狀態失敗', error as Error)
      }
    })

    logger?.info?.('✨ [Order] Module loaded') || console.log('📦 [Order] Module loaded')
  }
}
