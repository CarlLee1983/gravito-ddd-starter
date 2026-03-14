/**
 * @file pages.ts
 * @description Order 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（訂單列表、訂單詳細）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { OrderPageController } from '../Controllers/OrderPageController'

/**
 * 註冊 Order 頁面路由
 *
 * @param router - 模組路由器
 * @param pageController - Order 頁面控制器（處理頁面邏輯）
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: OrderPageController
): void {
  // 字串 'pageGuardMiddleware' 會自動從容器中解析
  const guardMiddleware = ['pageGuardMiddleware']

  // 訂單列表頁面（已登入用戶）
  router.get('/orders', guardMiddleware, (ctx: IHttpContext) => pageController.showIndex(ctx))

  // 訂單詳細頁面
  router.get('/orders/:id', guardMiddleware, (ctx: IHttpContext) => pageController.showDetail(ctx))

  // 訂單分析/統計頁面
  router.get('/orders/analytics/dashboard', guardMiddleware, (ctx: IHttpContext) => pageController.showAnalytics(ctx))
}
