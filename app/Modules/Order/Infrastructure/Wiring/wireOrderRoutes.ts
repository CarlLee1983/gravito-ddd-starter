/**
 * @file wireOrderRoutes.ts
 * @description Order 模組路由裝配
 */

import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { OrderController } from '../../Presentation/Controllers/OrderController'
import { OrderPageController } from '../../Presentation/Controllers/OrderPageController'
import { registerOrderRoutes } from '../../Presentation/Routes/order.routes'
import { registerPageRoutes } from '../../Presentation/Routes/pages'
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import type { PlaceOrderService } from '../../Application/Services/PlaceOrderService'

export function wireOrderRoutes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()

  // 從容器獲取依賴
  const repository = ctx.container.make('orderRepository') as IOrderRepository
  const placeOrderService = ctx.container.make('placeOrderService') as PlaceOrderService

  const controller = new OrderController(placeOrderService, repository)

  registerOrderRoutes(router, controller)

  // 建立 Page Controller 實例並註冊頁面路由
  const pageController = new OrderPageController(repository)
  registerPageRoutes(router, pageController)
}
