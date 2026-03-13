/**
 * @file wireProductRoutes.ts
 * @description 產品路由接線
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴特定框架。
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { ProductController } from '../../Presentation/Controllers/ProductController'
import { CreateProductService } from '../../Application/Services/CreateProductService'
import { GetProductService } from '../../Application/Services/GetProductService'
import { registerProductRoutes } from '../../Presentation/Routes/api'
import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Core/ILogger'

/**
 * 註冊 Product 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireProductRoutes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()

  // 嘗試從容器取得服務
  let productRepository: any
  let logger: ILogger
  let queryService: IProductQueryService
  let createProductService: CreateProductService
  let getProductService: GetProductService

  try {
    productRepository = ctx.container.make('productRepository')
    logger = ctx.container.make('logger') as ILogger
    queryService = ctx.container.make('productQueryService') as IProductQueryService
    createProductService = ctx.container.make('createProductService') as CreateProductService
    getProductService = ctx.container.make('getProductService') as GetProductService
  } catch (error) {
    console.warn('[wireProductRoutes] Warning: Application services not ready, skipping route registration')
    return
  }

  // 建立控制器
  const controller = new ProductController(
    createProductService,
    getProductService,
    queryService,
    logger
  )

  // 設置路由
  registerProductRoutes(router, controller)
}
