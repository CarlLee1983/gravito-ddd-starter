/**
 * @file pages.ts
 * @description Auth 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（Welcome、Login、Register、Dashboard）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { AuthPageController } from '../Controllers/AuthPageController'

/**
 * 註冊 Auth 頁面路由
 *
 * @param router - 模組路由器
 * @param pageController - Auth 頁面控制器（處理頁面邏輯）
 * @param container - DI 容器（用於解決註冊的 middleware）
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: AuthPageController,
  container?: { make(name: string): unknown }
): void {
  // 從容器取用頁面路由保護 middleware（可選）
  let pageGuardMiddleware: any = undefined
  if (container) {
    try {
      pageGuardMiddleware = container.make('pageGuardMiddleware')
    } catch {
      // middleware 不可用時，dashboard 路由將無保護
    }
  }

  // 登入頁面（公開，但已登入時重定向到 Dashboard）
  router.get('/login', [], (ctx: IHttpContext) => pageController.showLoginPage(ctx))

  // 註冊頁面（公開，但已登入時重定向到 Dashboard）
  router.get('/register', [], (ctx: IHttpContext) => pageController.showRegisterPage(ctx))

  // 個人儀表板（受保護，需要認證）
  router.get(
    '/dashboard',
    pageGuardMiddleware ? [pageGuardMiddleware] : [],
    (ctx: IHttpContext) => pageController.showDashboard(ctx)
  )
}
