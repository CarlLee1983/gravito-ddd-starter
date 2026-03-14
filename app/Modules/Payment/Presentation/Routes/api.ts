/**
 * @file api.ts
 * @description Payment 模組 API 路由定義
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { PaymentController } from '../Controllers/PaymentController'

/**
 * 註冊 Payment API 路由
 *
 * @param router - 模組路由器
 * @param controller - 支付控制器
 */
export function registerPaymentRoutes(router: IModuleRouter, controller: PaymentController): void {
	// 取得支付記錄 (by ID)
	router.get('/api/payments/:id', (ctx) => controller.getPayment(ctx))

	// 取得訂單的支付記錄 (by OrderId)
	router.get('/api/payments/order/:orderId', (ctx) => controller.getPaymentByOrderId(ctx))

	// 列出所有支付記錄 (含分頁)
	router.get('/api/payments', (ctx) => controller.listPayments(ctx))
}
