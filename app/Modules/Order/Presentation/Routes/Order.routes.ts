import { IRouter } from '@gravito/core'
import { OrderController } from '../Controllers/OrderController'

/**
 * Order 模組路由定義
 */
export function registerOrderRoutes(router: IRouter, controller: OrderController) {
  // 建立訂單
  router.post('/orders', (req, res) => controller.placeOrder(req, res))

  // 獲取訂單詳情
  router.get('/orders/:id', (req, res) => controller.getOrder(req, res))

  // 獲取用戶訂單列表
  router.get('/users/:userId/orders', (req, res) =>
    controller.getUserOrders(req, res),
  )

  // 確認訂單
  router.post('/orders/:id/confirm', (req, res) => controller.confirmOrder(req, res))

  // 發貨
  router.post('/orders/:id/ship', (req, res) => controller.shipOrder(req, res))

  // 取消訂單
  router.post('/orders/:id/cancel', (req, res) =>
    controller.cancelOrder(req, res),
  )
}
