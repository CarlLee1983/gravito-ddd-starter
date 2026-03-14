/**
 * @file api.ts
 * @description Portal 模組 API 路由定義
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import { PortalController } from '../Controllers/PortalController'

/**
 * 註冊 Portal 模組 API 路由
 *
 * @param router - 模組路由器
 * @param controller - Portal 控制器
 */
export function registerPortalRoutes(router: IModuleRouter, controller: PortalController): void {
  // 取得首頁資料 (API)
  router.get('/api/portal/data', (ctx) => controller.getHome(ctx))
}
