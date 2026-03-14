/**
 * @file pages.ts
 * @description 產品模組頁面路由
 *
 * 處理前端 SSR 頁面請求（產品列表頁面）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'

/**
 * 註冊產品頁面路由
 *
 * @param router - 模組路由器
 * @param queryService - 產品查詢服務
 */
export function registerPageRoutes(
  router: IModuleRouter,
  queryService: IProductQueryService
): void {
  // 產品列表頁面（公開）
  router.get('/products', async (ctx: IHttpContext) => {
    try {
      const products = await queryService.findAll()
      return ctx.render('Product/Index', { products })
    } catch (error) {
      return ctx.render('Product/Index', { products: [] })
    }
  })

  // 產品詳細頁面（公開）
  router.get('/products/:id', async (ctx: IHttpContext) => {
    try {
      const { id } = ctx.params
      const product = await queryService.findById(id!)
      if (!product) {
        return ctx.render('404')
      }
      return ctx.render('Product/Detail', { product })
    } catch (error) {
      return ctx.render('404')
    }
  })
}
