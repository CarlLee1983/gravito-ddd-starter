/**
 * @file api.ts
 * @description Order 模組 API 路由註冊
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import { OrderController } from '../Controllers/OrderController'

/**
 * 註冊 Order 模組的 API 路由
 * 
 * 定義訂單模組對外開放的 RESTful API 端點，涵蓋訂單的建立、查詢、確認、發貨與取消。
 * 
 * @param router - 模組路由器實例
 * @param controller - 訂單 API 控制器
 * @returns void
 */
export function registerOrderRoutes(router: IModuleRouter, controller: OrderController): void {
  /** 建立新訂單 */
  router.post('/orders', (ctx) => controller.placeOrder(ctx))

  /** 獲取單一訂單詳情 */
  router.get('/orders/:id', (ctx) => controller.getOrder(ctx))

  /** 獲取特定用戶的所有訂單 */
  router.get('/users/:userId/orders', (ctx) =>
    controller.getUserOrders(ctx),
  )

  /** 確認訂單（支付完成後調用） */
  router.post('/orders/:id/confirm', (ctx) => controller.confirmOrder(ctx))

  /** 標記訂單為已發貨 */
  router.post('/orders/:id/ship', (ctx) => controller.shipOrder(ctx))

  /** 取消訂單並提供理由 */
  router.post('/orders/:id/cancel', (ctx) =>
    controller.cancelOrder(ctx),
  )
}
