/**
 * @file wirePortalRoutes.ts
 * @description Portal 模組路由裝配
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { PortalController } from '../../Presentation/Controllers/PortalController'
import { registerPortalRoutes } from '../../Presentation/Routes/api'
import { registerPageRoutes } from '../../Presentation/Routes/pages'
import type { IProductQueryService } from '@/Modules/Product/Application/Queries/IProductQueryService'

/**
 * 註冊 Portal 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wirePortalRoutes(ctx: IRouteRegistrationContext): void {
  console.log('[PortalWiring] wirePortalRoutes starting')
  const router = ctx.createModuleRouter()

  // 嘗試從容器取得 Product 模組的 Query Service
  let productQuery: IProductQueryService
  try {
    productQuery = ctx.container.make('productQueryService') as IProductQueryService
  } catch (error) {
    console.warn('[wirePortalRoutes] Warning: productQueryService not found, using empty mock')
    productQuery = {
      findAll: async () => [],
      findById: async () => null
    }
  }

  const controller = new PortalController(productQuery)
  
  router.get('/test-module-router', async (ctx) => {
    return ctx.text('Module router success')
  })

  // 1. 註冊 API 路由 (/api/portal/...)
  console.log('[PortalWiring] Calling registerPortalRoutes')
  registerPortalRoutes(router, controller)
  
  // 2. 註冊前端頁面路由 (/, /home, ...)
  console.log('[PortalWiring] Calling registerPageRoutes')
  registerPageRoutes(router, controller)
}
