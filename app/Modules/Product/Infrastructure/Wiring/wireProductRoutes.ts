/**
 * @file wireProductRoutes.ts
 * @description 產品路由接線
 */

import { Router } from 'express'
import { ProductController } from '../../Presentation/Controllers/ProductController'
import { CreateProductService } from '../../Application/Services/CreateProductService'
import { GetProductService } from '../../Application/Services/GetProductService'
import { registerProductRoutes } from '../../Presentation/Routes/api'
import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'

export function wireProductRoutes(container: any, mainRouter: Router): void {
  // 取得服務
  const productRepository = container.make('productRepository')
  const logger = container.make('logger') as any

  // 嘗試取得查詢服務（可能不存在）
  let queryService: IProductQueryService | undefined
  try {
    queryService = container.make('productQueryService')
  } catch {
    // 服務不存在時優雅降級
    queryService = undefined
  }

  if (!queryService) {
    logger.warn('ProductQueryService not found, CQRS read side disabled')
    return
  }

  // 建立服務
  const createProductService = new CreateProductService(productRepository)
  const getProductService = new GetProductService(queryService)

  // 建立控制器
  const controller = new ProductController(
    createProductService,
    getProductService,
    queryService,
    logger
  )

  // 設置路由
  registerProductRoutes(mainRouter, controller)
}
