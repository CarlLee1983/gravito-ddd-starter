/**
 * @file pages.ts
 * @description Order 模組頁面路由註冊
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { OrderPageController } from '../Controllers/OrderPageController'

/**
 * 註冊 Order 模組的頁面路由
 * 
 * 定義與訂單相關的 Web 頁面路徑，並將其映射至頁面控制器的對應方法。
 * 大部分路由皆包含 'pageGuardMiddleware' 以確保用戶認證。
 *
 * @param router - 模組路由器實例
 * @param pageController - 訂單頁面控制器
 * @returns void
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: OrderPageController
): void {
  // 字串 'pageGuardMiddleware' 會自動從 IoC 容器中解析
  const guardMiddleware = ['pageGuardMiddleware']

  /** 訂單列表頁面 */
  router.get('/orders', guardMiddleware, (ctx: IHttpContext) => pageController.showIndex(ctx))

  /** 訂單詳細頁面 */
  router.get('/orders/:id', guardMiddleware, (ctx: IHttpContext) => pageController.showDetail(ctx))

  /** 訂單分析/統計儀表板頁面 */
  router.get('/orders/analytics/dashboard', guardMiddleware, (ctx: IHttpContext) => pageController.showAnalytics(ctx))
}
