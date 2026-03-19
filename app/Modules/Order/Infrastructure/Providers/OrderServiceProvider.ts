/**
 * @file OrderServiceProvider.ts
 * @description Order 模組服務提供者 (Service Provider)
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import { PlaceOrderService } from '../../Application/Services/PlaceOrderService'
import { OrderMessageService } from '../Services/OrderMessageService'
import { CartCheckoutRequestedHandler } from '../../Application/Handlers/CartCheckoutRequestedHandler'
import { PaymentSucceededHandler } from '../../Application/Handlers/PaymentSucceededHandler'
import { EventListenerRegistry } from '@/Foundation/Infrastructure/Registries/EventListenerRegistry'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
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

    // 註冊事件處理器
    container.singleton('cartCheckoutRequestedHandler', (c: IContainer) => {
      const placeOrderService = c.make('placeOrderService') as PlaceOrderService
      const logger = c.make('logger') as ILogger
      return new CartCheckoutRequestedHandler(placeOrderService, logger)
    })

    container.singleton('paymentSucceededHandler', (c: IContainer) => {
      const orderRepository = c.make('orderRepository') as IOrderRepository
      const logger = c.make('logger') as ILogger
      return new PaymentSucceededHandler(orderRepository, logger)
    })

    // 向中心化 Registry 聲明事件監聽
    EventListenerRegistry.register({
      moduleName: 'Order',
      listeners: [
        {
          eventName: 'CartCheckoutRequested',
          handlerFactory: (c) => {
            const handler = c.make('cartCheckoutRequestedHandler') as CartCheckoutRequestedHandler
            return (event) => handler.handle(event)
          },
        },
        {
          eventName: 'PaymentSucceeded',
          handlerFactory: (c) => {
            const handler = c.make('paymentSucceededHandler') as PaymentSucceededHandler
            return (event) => handler.handle(event)
          },
        },
      ],
    })
  }

  /**
   * 模組啟動後的初始化工作
   *
   * 事件監聽與事件處理由中心化 Registry 管理。
   * SharedServiceProvider.boot() 中的 EventListenerRegistry.bindAll() 會自動綁定所有註冊的事件監聽器。
   *
   * @param context - 模組執行上下文
   */
  override boot(context: any): void {
    const container = context.container ?? context
    const logger = container.make('logger') as ILogger | undefined

    if (process.env.NODE_ENV === 'development') {
      logger?.info?.('✨ [Order] Module loaded') || console.log('📦 [Order] Module loaded')
    }

    // 事件監聽由 EventListenerRegistry 在 SharedServiceProvider.boot() 中自動綁定
  }
}
