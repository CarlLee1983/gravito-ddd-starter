import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import { OrderController } from '../Controllers/OrderController'

/**
 * Order 模組路由定義
 */
export function registerOrderRoutes(router: IModuleRouter, controller: OrderController) {
  // 建立訂單
  router.post('/orders', (ctx) => controller.placeOrder(ctx))

  // 獲取訂單詳情
  router.get('/orders/:id', (ctx) => controller.getOrder(ctx))

  // 獲取用戶訂單列表
  router.get('/users/:userId/orders', (ctx) =>
    controller.getUserOrders(ctx),
  )

  // 確認訂單
  router.post('/orders/:id/confirm', (ctx) => controller.confirmOrder(ctx))

  // 發貨
  router.post('/orders/:id/ship', (ctx) => controller.shipOrder(ctx))

  // 取消訂單
  router.post('/orders/:id/cancel', (ctx) =>
    controller.cancelOrder(ctx),
  )
}
