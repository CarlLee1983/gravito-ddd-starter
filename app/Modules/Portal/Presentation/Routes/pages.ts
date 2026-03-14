/**
 * @file pages.ts
 * @description Portal 模組前端頁面路由定義。處理首頁、行銷頁面等前端應用 (SPA/SSR) 的入口路由。
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import { PortalPageController } from '../Controllers/PortalPageController'

/**
 * 註冊 Portal 模組的前端頁面路由
 * @param router 模組路由器實例
 * @param pageController Portal 頁面控制器
 * @returns void
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: PortalPageController
): void {
  // 渲染首頁組件 (如 Welcome 或 Home)
  router.get('/', (ctx) => pageController.showIndex(ctx))
}
