/**
 * @file pages.ts
 * @description Portal 模組前端頁面路由定義
 *
 * 處理首頁、行銷頁面等前端應用 (SPA/SSR) 的入口路由。
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import { PortalController } from '../Controllers/PortalController'

/**
 * 註冊 Portal 模組的前端頁面路由
 *
 * @param router - 模組路由器
 * @param controller - Portal 控制器
 */
export function registerPageRoutes(router: IModuleRouter, controller: PortalController): void {
  // 渲染首頁組件 (如 Welcome 或 Home)
  router.get('/', (ctx) => controller.renderHome(ctx))
}
