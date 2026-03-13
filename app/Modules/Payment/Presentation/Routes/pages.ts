/**
 * @file pages.ts
 * @description Payment 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（支付頁面）
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * 註冊 Payment 頁面路由
 *
 * @param router - 模組路由器
 */
export function registerPageRoutes(router: IModuleRouter): void {
  // 支付成功頁面
  router.get('/payment/success', [], async (ctx: IHttpContext) => {
    const orderId = ctx.query('orderId') as string | undefined
    return ctx.render('Payment/Success', { orderId })
  })

  // 支付失敗頁面
  router.get('/payment/failed', [], async (ctx: IHttpContext) => {
    const orderId = ctx.query('orderId') as string | undefined
    const reason = ctx.query('reason') as string | undefined
    return ctx.render('Payment/Failed', { orderId, reason })
  })

  // 支付待機頁面
  router.get('/payment/pending', [], async (ctx: IHttpContext) => {
    const orderId = ctx.query('orderId') as string | undefined
    return ctx.render('Payment/Pending', { orderId })
  })
}
