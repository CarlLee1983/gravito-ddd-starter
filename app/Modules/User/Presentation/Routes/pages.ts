/**
 * @file pages.ts
 * @description User 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（用戶列表、個人檔案）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { UserPageController } from '../Controllers/UserPageController'

/**
 * 註冊 User 頁面路由
 *
 * @param router - 模組路由器
 * @param pageController - User 頁面控制器（處理頁面邏輯）
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: UserPageController
): void {
  // 用戶列表頁面（公開）
  router.get('/users', (ctx: IHttpContext) => pageController.showIndex(ctx))

  // 用戶詳細頁面（檔案，公開）
  router.get('/users/:id', (ctx: IHttpContext) => pageController.showProfile(ctx))

  // 個人檔案頁面（受保護）
  // 字串 'pageGuardMiddleware' 會自動從容器中解析
  router.get('/profile', ['pageGuardMiddleware'], (ctx: IHttpContext) => pageController.showMyProfile(ctx))
}
