/**
 * @file wireOrderRoutes.ts
 * @description Order 模組路由裝配與依賴注入
 */

import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import type { IOrderMessages } from '@/Modules/Order/Presentation/Ports/IOrderMessages'
import { OrderController } from '../../Presentation/Controllers/OrderController'
import { OrderPageController } from '../../Presentation/Controllers/OrderPageController'
import { registerOrderRoutes } from '../../Presentation/Routes/api'
import { registerPageRoutes } from '../../Presentation/Routes/pages'
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import type { PlaceOrderService } from '../../Application/Services/PlaceOrderService'

/**
 * 裝配 Order 模組的路由與控制器
 * 
 * 此函數負責從 IoC 容器中提取所需的依賴（如 Service, Repository），
 * 實例化表現層的控制器 (Controller)，並將其註冊到路由系統中。
 * 涵蓋了 API 路由與傳統頁面路由的配置。
 * 
 * @param ctx - 路由註冊上下文，提供容器存取與路由創建工具
 * @returns void
 */
export function wireOrderRoutes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()

  // 從容器獲取依賴
  const repository = ctx.container.make('orderRepository') as IOrderRepository
  const placeOrderService = ctx.container.make('placeOrderService') as PlaceOrderService
  const orderMessages = ctx.container.make('orderMessages') as IOrderMessages

  // 實例化 API 控制器並註冊 API 路由
  const controller = new OrderController(placeOrderService, repository, orderMessages)
  registerOrderRoutes(router, controller)

  // 實例化頁面控制器並註冊頁面路由
  const pageController = new OrderPageController(repository)
  registerPageRoutes(router, pageController)
}
