/**
 * @file PaymentPageController.ts
 * @description Payment 頁面控制器
 *
 * 處理 SSR 頁面請求：支付結果頁面（成功、失敗、待機）。
 * 這些是公開頁面，允許用戶通過外部連結訪問。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'

/**
 * Payment 頁面控制器
 *
 * 負責支付結果頁面的顯示邏輯。
 */
export class PaymentPageController {
  /**
   * 顯示支付成功頁面
   *
   * @param ctx - HTTP 上下文
   * @returns 渲染支付成功頁面
   */
  async showSuccess(ctx: IHttpContext): Promise<Response> {
    const orderId = ctx.get('orderId') as string | undefined
    return ctx.render('Payment/Success', { orderId })
  }

  /**
   * 顯示支付失敗頁面
   *
   * @param ctx - HTTP 上下文
   * @returns 渲染支付失敗頁面
   */
  async showFailed(ctx: IHttpContext): Promise<Response> {
    const orderId = ctx.get('orderId') as string | undefined
    const reason = ctx.get('reason') as string | undefined
    return ctx.render('Payment/Failed', { orderId, reason })
  }

  /**
   * 顯示支付待機頁面
   *
   * @param ctx - HTTP 上下文
   * @returns 渲染支付待機頁面
   */
  async showPending(ctx: IHttpContext): Promise<Response> {
    const orderId = ctx.get('orderId') as string | undefined
    return ctx.render('Payment/Pending', { orderId })
  }
}
