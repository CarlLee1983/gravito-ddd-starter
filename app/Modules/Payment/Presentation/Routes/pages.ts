/**
 * @file pages.ts
 * @description Payment 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（支付頁面）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'

/**
 * 註冊 Payment 頁面路由
 *
 * @param router - 模組路由器
 * @param pageGuardMiddleware - 頁面認證中間件（可選）
 *
 * 注意：支付結果頁面（success/failed/pending）為公開頁面，允許用戶通過外部連結訪問。
 * 若需要強制認證驗證，可啟用 pageGuardMiddleware。
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageGuardMiddleware?: any
): void {
  // 支付成功頁面（公開）
  router.get('/payment/success', [], async (ctx: IHttpContext) => {
    const orderId = ctx.query('orderId') as string | undefined
    return ctx.render('Payment/Success', { orderId })
  })

  // 支付失敗頁面（公開）
  router.get('/payment/failed', [], async (ctx: IHttpContext) => {
    const orderId = ctx.query('orderId') as string | undefined
    const reason = ctx.query('reason') as string | undefined
    return ctx.render('Payment/Failed', { orderId, reason })
  })

  // 支付待機頁面（公開）
  router.get('/payment/pending', [], async (ctx: IHttpContext) => {
    const orderId = ctx.query('orderId') as string | undefined
    return ctx.render('Payment/Pending', { orderId })
  })
}
