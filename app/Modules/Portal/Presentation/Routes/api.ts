/**
 * @file api.ts
 * @description Portal 模組 API 路由定義，負責首頁聚合資料的 API 端點註冊
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import { PortalController } from '../Controllers/PortalController'

/**
 * 註冊 Portal 模組 API 路由
 * @param router 模組路由器實例
 * @param apiController Portal API 控制器
 * @returns void
 */
export function registerPortalRoutes(router: IModuleRouter, apiController: PortalController): void {
  // 取得首頁資料 (API)
  router.get('/api/portal/data', (ctx) => apiController.getHome(ctx))
}
