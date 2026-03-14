/**
 * @file pages.ts
 * @description Payment 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（支付頁面）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { PaymentPageController } from '../Controllers/PaymentPageController'

/**
 * 註冊 Payment 頁面路由
 *
 * @param router - 模組路由器
 * @param pageController - Payment 頁面控制器（處理頁面邏輯）
 *
 * 注意：支付結果頁面（success/failed/pending）為公開頁面，允許用戶通過外部連結訪問。
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageController: PaymentPageController
): void {
  // 支付成功頁面（公開）
  router.get('/payment/success', (ctx: IHttpContext) => pageController.showSuccess(ctx))

  // 支付失敗頁面（公開）
  router.get('/payment/failed', (ctx: IHttpContext) => pageController.showFailed(ctx))

  // 支付待機頁面（公開）
  router.get('/payment/pending', (ctx: IHttpContext) => pageController.showPending(ctx))
}
