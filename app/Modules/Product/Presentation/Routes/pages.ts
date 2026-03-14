/**
 * @file pages.ts
 * @description 產品模組頁面路由
 *
 * 處理前端 SSR 頁面請求（產品列表頁面）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { ProductPageController } from '../Controllers/ProductPageController'

/**
 * 註冊產品頁面路由
 *
 * @param router - 模組路由器
 * @param pageController - Product 頁面控制器（處理頁面邏輯）
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: ProductPageController
): void {
  // 產品列表頁面（公開）
  router.get('/products', (ctx: IHttpContext) => pageController.showIndex(ctx))

  // 產品詳細頁面（公開）
  router.get('/products/:id', (ctx: IHttpContext) => pageController.showDetail(ctx))
}
