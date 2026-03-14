/**
 * @file ProductPageController.ts
 * @description Product 頁面控制器
 *
 * 處理 SSR 頁面請求：產品列表、產品詳細頁面。
 * 封裝產品頁面的邏輯。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IProductQueryService } from '../../Application/Queries/IProductQueryService'

/**
 * Product 頁面控制器
 *
 * 負責產品列表頁和產品詳細頁的顯示邏輯。
 */
export class ProductPageController {
  constructor(private readonly queryService: IProductQueryService) {}

  /**
   * 顯示產品列表頁面。
   */
  async showIndex(ctx: IHttpContext): Promise<Response> {
    try {
      const products = await this.queryService.findAll()
      return ctx.render('Product/Index', { products })
    } catch (error) {
      return ctx.render('Product/Index', { products: [] })
    }
  }

  /**
   * 顯示產品詳細頁面。
   */
  async showDetail(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const product = await this.queryService.findById(id!)
      if (!product) {
        return ctx.render('404')
      }
      return ctx.render('Product/Detail', { product })
    } catch (error) {
      return ctx.render('404')
    }
  }
}
