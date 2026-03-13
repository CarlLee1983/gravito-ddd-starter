import { IModuleDefinition } from '@gravito/core'
import { OrderServiceProvider } from './Infrastructure/Providers/OrderServiceProvider'
import { registerOrderRoutes } from './Presentation/Routes/Order.routes'
import { OrderController } from './Presentation/Controllers/OrderController'
import { PlaceOrderService } from './Application/Services/PlaceOrderService'
import { IOrderRepository } from './Domain/Repositories/IOrderRepository'

// 導出 Domain 層
export { Order } from './Domain/Aggregates/Order'
export { OrderLine } from './Domain/Aggregates/OrderLine'
export { OrderId } from './Domain/ValueObjects/OrderId'
export { OrderStatus, OrderStatusEnum } from './Domain/ValueObjects/OrderStatus'
export { Money } from './Domain/ValueObjects/Money'
export { OrderTotal } from './Domain/ValueObjects/OrderTotal'
export { IOrderRepository } from './Domain/Repositories/IOrderRepository'

// 導出 Events
export { OrderPlaced } from './Domain/Events/OrderPlaced'
export { OrderConfirmed } from './Domain/Events/OrderConfirmed'
export { OrderShipped } from './Domain/Events/OrderShipped'
export { OrderCancelled } from './Domain/Events/OrderCancelled'

// 導出 Application 層
export { PlaceOrderService } from './Application/Services/PlaceOrderService'
export { PlaceOrderDTO, OrderResponseDTO } from './Application/DTOs/PlaceOrderDTO'

// 導出 Infrastructure 層
export { OrderRepository } from './Infrastructure/Repositories/OrderRepository'
export { OrderServiceProvider } from './Infrastructure/Providers/OrderServiceProvider'

/**
 * Order Module Definition
 * 遵循 gravito-ddd 模組自動註冊機制
 */
export const OrderModuleDefinition: IModuleDefinition = {
  name: 'Order',
  version: '1.0.0',

  /**
   * 註冊 Repository 實現
   */
  async registerRepositories(core: any): Promise<void> {
    const provider = new OrderServiceProvider()
    provider.registerRepositories(core)
    provider.registerServices(core)
    provider.registerEventListeners(core)
  },

  /**
   * 註冊 HTTP 路由
   */
  async registerRoutes(core: any): Promise<void> {
    try {
      const router = core.container.make('router')
      const placeOrderService = core.container.make('placeOrderService') as PlaceOrderService
      const orderRepository = core.container.make('orderRepository') as IOrderRepository

      const controller = new OrderController(placeOrderService, orderRepository)
      registerOrderRoutes(router, controller)

      console.log('[Order Module] Routes registered successfully')
    } catch (error) {
      console.warn('[Order Module] Failed to register routes:', error instanceof Error ? error.message : 'Unknown error')
    }
  },
}

export default OrderModuleDefinition
