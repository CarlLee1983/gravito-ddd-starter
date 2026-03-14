/**
 * @file OrderPageController.ts
 * @description Order 頁面控制器
 *
 * 處理 SSR 頁面請求：訂單列表、訂單詳細、訂單分析。
 * 封裝訂單頁面的邏輯。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'

/**
 * Order 頁面控制器
 *
 * 負責訂單列表、詳細頁、分析頁的顯示邏輯（需認證用戶）。
 */
export class OrderPageController {
  constructor(private readonly repository: IOrderRepository) {}

  /**
   * 顯示訂單列表頁面。
   * 需由 Page Guard 中間件先行設定 authenticatedUserId；未登入時重定向到 /login。
   */
  async showIndex(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    try {
      const orders = await this.repository.findByUserId(userId)
      return ctx.render('Order/Index', { orders })
    } catch (error) {
      return ctx.render('Order/Index', { orders: [] })
    }
  }

  /**
   * 顯示訂單詳細頁面。
   * 需由 Page Guard 中間件先行設定 authenticatedUserId；未登入時重定向到 /login。
   */
  async showDetail(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    try {
      const { id } = ctx.params
      const order = await this.repository.findById(id!)
      if (!order) {
        return ctx.render('404')
      }
      return ctx.render('Order/Detail', { order })
    } catch (error) {
      return ctx.render('404')
    }
  }

  /**
   * 顯示訂單分析/統計頁面。
   * 需由 Page Guard 中間件先行設定 authenticatedUserId；未登入時重定向到 /login。
   */
  async showAnalytics(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    try {
      const orders = await this.repository.findByUserId(userId)
      return ctx.render('Order/Analytics', { orders })
    } catch (error) {
      return ctx.render('Order/Analytics', { orders: [] })
    }
  }
}
