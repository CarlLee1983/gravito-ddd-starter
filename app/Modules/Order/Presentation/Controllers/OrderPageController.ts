/**
 * @file OrderPageController.ts
 * @description Order 模組頁面控制器
 *
 * 處理伺服器端渲染 (SSR) 的頁面請求，包括訂單列表、訂單詳情及訂單分析頁面。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'

/**
 * Order 頁面控制器
 * 
 * 負責處理與訂單相關的頁面顯示邏輯。所有方法皆預期在已認證的上下文中執行。
 * 依賴 Page Guard 中間件確保用戶已登入並提供 authenticatedUserId。
 */
export class OrderPageController {
  /**
   * 初始化訂單頁面控制器
   * 
   * @param repository - 訂單倉儲介面
   */
  constructor(private readonly repository: IOrderRepository) {}

  /**
   * 顯示訂單列表頁面
   * 
   * 獲取當前登入用戶的所有訂單並渲染列表頁面。
   * 
   * @param ctx - HTTP 上下文
   * @returns Promise<Response> 渲染後的 HTML 回應或重定向
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
   * 顯示訂單詳細頁面
   * 
   * 根據 URL 參數中的訂單 ID 獲取詳細資訊並渲染。
   * 
   * @param ctx - HTTP 上下文
   * @returns Promise<Response> 渲染後的 HTML 回應、404 頁面或重定向
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
   * 顯示訂單分析與統計儀表板
   * 
   * 獲取用戶訂單數據以供分析圖表顯示。
   * 
   * @param ctx - HTTP 上下文
   * @returns Promise<Response> 渲染後的 HTML 回應或重定向
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
