/**
 * @file api.ts
 * @description Refund 模組的 HTTP 路由定義
 *
 * 注意：/refunds/pending-reviews 必須在 /refunds/:id 之前定義，
 * 避免 "pending-reviews" 被當作 :id 參數匹配。
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { RefundController } from '../Controllers/RefundController'

/**
 * 註冊 Refund 模組路由
 *
 * @param router - 模組路由器
 * @param controller - 退款控制器
 */
export function registerRefundRoutes(router: IModuleRouter, controller: RefundController): void {
	// 建立退款申請
	router.post('/refunds', (ctx) => controller.requestRefund(ctx))

	// 待審核列表（必須在 :id 路由之前）
	router.get('/refunds/pending-reviews', (ctx) => controller.getPendingReviews(ctx))

	// 單筆退款查詢
	router.get('/refunds/:id', (ctx) => controller.getRefund(ctx))

	// 使用者退款列表
	router.get('/refunds', (ctx) => controller.getRefundsList(ctx))

	// 依訂單查詢退款
	router.get('/orders/:orderId/refunds', (ctx) => controller.getRefundsByOrder(ctx))

	// 退款狀態轉換
	router.post('/refunds/:id/approve', (ctx) => controller.approveRefund(ctx))
	router.post('/refunds/:id/reject', (ctx) => controller.rejectRefund(ctx))
	router.post('/refunds/:id/ship', (ctx) => controller.shipItems(ctx))
	router.post('/refunds/:id/receive', (ctx) => controller.receiveItems(ctx))
}
