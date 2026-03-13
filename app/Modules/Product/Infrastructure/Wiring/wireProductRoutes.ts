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
import { registerPageRoutes } from '../../Presentation/Routes/pages'
import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Core/ILogger'

/**
 * 註冊 Product 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireProductRoutes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()

  console.log('[wireProductRoutes] Starting route registration...')

  // 直接取得服務，讓任何錯誤暴露在日誌中
  console.log('[wireProductRoutes] Resolving productRepository...')
  const productRepository = ctx.container.make('productRepository')
  console.log('[wireProductRoutes] ✓ productRepository resolved')

  console.log('[wireProductRoutes] Resolving logger...')
  let logger: ILogger
  try {
    logger = ctx.container.make('logger') as ILogger
  } catch {
    // logger 服務可能在路由裝配階段不可用，使用降級實現
    logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    } as any
  }
  console.log('[wireProductRoutes] ✓ logger resolved')

  console.log('[wireProductRoutes] Resolving productQueryService...')
  const queryService = ctx.container.make('productQueryService') as IProductQueryService
  console.log('[wireProductRoutes] ✓ productQueryService resolved')

  console.log('[wireProductRoutes] Resolving createProductService...')
  const createProductService = ctx.container.make('createProductService') as CreateProductService
  console.log('[wireProductRoutes] ✓ createProductService resolved')

  console.log('[wireProductRoutes] Resolving getProductService...')
  const getProductService = ctx.container.make('getProductService') as GetProductService
  console.log('[wireProductRoutes] ✓ getProductService resolved')

  // 建立控制器
  console.log('[wireProductRoutes] Creating ProductController...')
  const controller = new ProductController(
    createProductService,
    getProductService,
    queryService,
    logger
  )
  console.log('[wireProductRoutes] ✓ ProductController created')

  // 設置路由
  console.log('[wireProductRoutes] Registering API routes...')
  registerProductRoutes(router, controller)

  console.log('[wireProductRoutes] Registering page routes...')
  registerPageRoutes(router, queryService)

  console.log('[wireProductRoutes] ✅ Product routes registered successfully')
}
