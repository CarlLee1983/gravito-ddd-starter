/**
 * @file pages.ts
 * @description Cart 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（購物車頁面）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { CartPageController } from '../Controllers/CartPageController'

/**
 * 註冊 Cart 頁面路由
 *
 * @param router - 模組路由器
 * @param pageController - Cart 頁面控制器（處理頁面邏輯）
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: CartPageController
): void {
  // 購物車頁面（受保護）
  // 字串 'pageGuardMiddleware' 會自動從容器中解析
  router.get('/cart', ['pageGuardMiddleware'], (ctx: IHttpContext) => pageController.showCart(ctx))
}
