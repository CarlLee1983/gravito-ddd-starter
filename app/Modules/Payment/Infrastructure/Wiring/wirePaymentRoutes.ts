/**
 * @file wirePaymentRoutes.ts
 * @description Payment 模組路由裝配
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { PaymentController } from '../../Presentation/Controllers/PaymentController'
import { registerPaymentRoutes } from '../../Presentation/Routes/payment.routes'
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'

export function wirePaymentRoutes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()
  
  // 從容器獲取 Repository 實例
  // 注意：此時 RepositoryRegistry 已經由 RepositoryResolver 實例化並註冊到容器
  const repository = ctx.container.make('paymentRepository') as IPaymentRepository
  
  const controller = new PaymentController(repository)
  
  registerPaymentRoutes(router, controller)
}
