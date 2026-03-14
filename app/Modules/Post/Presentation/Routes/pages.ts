/**
 * @file pages.ts
 * @description Post 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（文章列表、詳細頁面）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { PostPageController } from '../Controllers/PostPageController'

/**
 * 註冊 Post 頁面路由
 *
 * @param router - 模組路由器
 * @param pageController - Post 頁面控制器（處理頁面邏輯）
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: PostPageController
): void {
  // 文章列表頁面（公開）
  router.get('/posts', (ctx: IHttpContext) => pageController.showIndex(ctx))

  // 文章詳細頁面（公開）
  router.get('/posts/:id', (ctx: IHttpContext) => pageController.showDetail(ctx))

  // 新建文章頁面（受保護）
  // 字串 'pageGuardMiddleware' 會自動從容器中解析
  router.get('/posts/create', ['pageGuardMiddleware'], (ctx: IHttpContext) => pageController.showCreate(ctx))
}
