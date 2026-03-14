/**
 * @file pages.ts
 * @description Order 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（訂單列表、訂單詳細）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'

/**
 * 註冊 Order 頁面路由
 *
 * @param router - 模組路由器
 * @param orderRepository - 訂單 Repository
 */
export function registerPageRoutes(
  router: IModuleRouter,
  orderRepository: IOrderRepository
): void {
  // 訂單列表頁面（已登入用戶）
  router.get('/orders', [], async (ctx: IHttpContext) => {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    try {
      const orders = await orderRepository.findByUserId(userId)
      return ctx.render('Order/Index', { orders })
    } catch (error) {
      return ctx.render('Order/Index', { orders: [] })
    }
  })

  // 訂單詳細頁面
  router.get('/orders/:id', [], async (ctx: IHttpContext) => {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    try {
      const { id } = ctx.params
      const order = await orderRepository.findById(id!)
      if (!order) {
        return ctx.render('404')
      }
      return ctx.render('Order/Detail', { order })
    } catch (error) {
      return ctx.render('404')
    }
  })

  // 訂單分析/統計頁面
  router.get('/orders/analytics/dashboard', [], async (ctx: IHttpContext) => {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    try {
      const orders = await orderRepository.findByUserId(userId)
      return ctx.render('Order/Analytics', { orders })
    } catch (error) {
      return ctx.render('Order/Analytics', { orders: [] })
    }
  })
}
