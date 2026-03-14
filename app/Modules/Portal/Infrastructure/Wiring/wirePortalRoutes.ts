/**
 * @file wirePortalRoutes.ts
 * @description Portal 模組路由裝配函數，負責初始化查詢服務、控制器並註冊模組路由
 */

import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import { PortalController } from '../../Presentation/Controllers/PortalController'
import { PortalPageController } from '../../Presentation/Controllers/PortalPageController'
import { registerPortalRoutes } from '../../Presentation/Routes/api'
import { registerPageRoutes } from '../../Presentation/Routes/pages'
import type { IPortalQueryService } from '../../Presentation/Queries/IPortalQueryService'
import { PortalQueryService } from '../Services/PortalQueryService'
import type { IProductQueryService } from '@/Modules/Product/Application/Queries/IProductQueryService'

/**
 * 註冊 Portal 模組路由（供 IModuleDefinition.registerRoutes 使用）
 * @param ctx 框架無關的註冊用 Context（包含服務容器與路由器工廠）
 * @returns void
 */
export function wirePortalRoutes(ctx: IRouteRegistrationContext): void {
  // 嘗試取得 logger（可能不可用）
  let logger: ILogger | null = null
  try {
    logger = ctx.container.make('logger') as ILogger
  } catch {
    // logger 不可用，忽略
  }

  logger?.info('[Portal] 開始註冊路由')
  const router = ctx.createModuleRouter()

  // 嘗試從容器取得 Product 模組的 Query Service
  let productQuery: IProductQueryService | null = null
  try {
    productQuery = ctx.container.make('productQueryService') as IProductQueryService
    logger?.info('[Portal] 已取得 productQueryService')
  } catch (error) {
    logger?.warn('[Portal] productQueryService 不可用，將使用空實現')
  }

  // 建立 Portal Query Service（聚合多個模組的資料）
  const portalQuery: IPortalQueryService = new PortalQueryService(productQuery)

  // 建立 API 和頁面控制器
  const apiController = new PortalController(portalQuery)
  const pageController = new PortalPageController(portalQuery)

  // 1. 註冊 API 路由 (/api/portal/...)
  logger?.info('[Portal] 註冊 API 路由')
  registerPortalRoutes(router, apiController)

  // 2. 註冊前端頁面路由 (/, /home, ...)
  logger?.info('[Portal] 註冊頁面路由')
  registerPageRoutes(router, pageController)

  logger?.info('[Portal] 路由註冊完成')
}
