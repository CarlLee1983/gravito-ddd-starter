/**
 * @file RefundController.ts
 * @description 退款模組 HTTP 控制器
 *
 * 處理退款相關的 HTTP 請求，委派業務邏輯至應用層服務。
 * 遵循 Controller 開發規範：無寫死訊息、try-catch 捕獲、正確狀態碼。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { RefundApplicationService } from '../../Application/Services/RefundApplicationService'
import type { IRefundQueryService } from '../../Application/Queries/IRefundQueryService'
import type { IRefundMessages } from '../Ports/IRefundMessages'

/**
 * 退款控制器
 *
 * 提供退款申請的完整 CRUD 操作與狀態轉換 API。
 */
export class RefundController {
	constructor(
		private readonly refundService: RefundApplicationService,
		private readonly queryService: IRefundQueryService,
		private readonly messages: IRefundMessages
	) {}

	/**
	 * 提交退款申請
	 *
	 * POST /refunds
	 */
	async requestRefund(ctx: IHttpContext): Promise<Response> {
		try {
			const body = await ctx.getJsonBody<{
				orderId?: string
				type?: string
				items?: unknown[]
			}>()

			const { orderId, type, items } = body

			if (!orderId || !type || !items) {
				return ctx.json(
					{ success: false, error: this.messages.missingRequiredFields() },
					400
				)
			}

			const userId = ctx.params.userId ?? 'anonymous'

			const refundDto = await this.refundService.requestRefund(
				{ orderId, type: type as 'refund_only' | 'return_and_refund', items: items as any[] },
				userId
			)

			return ctx.json({ success: true, data: refundDto, message: this.messages.requestSuccess() }, 201)
		} catch (error) {
			const message = String(error)
			if (message.includes('超過') || message.includes('exceeds')) {
				return ctx.json({ success: false, error: this.messages.exceedsOrderAmount() }, 400)
			}
			if (message.includes('不符合') || message.includes('not eligible')) {
				return ctx.json({ success: false, error: this.messages.orderNotEligible() }, 400)
			}
			return ctx.json({ success: false, error: message }, 400)
		}
	}

	/**
	 * 查詢單筆退款申請
	 *
	 * GET /refunds/:id
	 */
	async getRefund(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params

			const refund = await this.queryService.getById(id!)
			if (!refund) {
				return ctx.json({ success: false, error: this.messages.notFound() }, 404)
			}

			return ctx.json({ success: true, data: refund })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 500)
		}
	}

	/**
	 * 根據訂單查詢退款列表
	 *
	 * GET /orders/:orderId/refunds
	 */
	async getRefundsByOrder(ctx: IHttpContext): Promise<Response> {
		try {
			const { orderId } = ctx.params

			const refunds = await this.queryService.getByOrderId(orderId!)

			return ctx.json({ success: true, data: refunds })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 500)
		}
	}

	/**
	 * 根據使用者查詢退款列表
	 *
	 * GET /refunds?userId=...
	 */
	async getRefundsList(ctx: IHttpContext): Promise<Response> {
		try {
			const userId = ctx.params.userId ?? ctx.query.userId

			const limitStr = ctx.query.limit
			const offsetStr = ctx.query.offset
			const pagination = {
				limit: limitStr ? Number(limitStr) : undefined,
				offset: offsetStr ? Number(offsetStr) : undefined,
			}

			const refunds = await this.queryService.getByUserId(userId!, pagination)

			return ctx.json({ success: true, data: refunds })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 500)
		}
	}

	/**
	 * 核准退款申請
	 *
	 * POST /refunds/:id/approve
	 */
	async approveRefund(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params
			const body = await ctx.getJsonBody<{ reviewerId?: string }>()

			const refundDto = await this.refundService.approveRefund(id!, body.reviewerId)

			return ctx.json({ success: true, data: refundDto, message: this.messages.approveSuccess() })
		} catch (error) {
			const message = String(error)
			if (message.includes('不存在') || message.includes('not found')) {
				return ctx.json({ success: false, error: this.messages.notFound() }, 404)
			}
			return ctx.json({ success: false, error: message }, 400)
		}
	}

	/**
	 * 拒絕退款申請
	 *
	 * POST /refunds/:id/reject
	 */
	async rejectRefund(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params
			const body = await ctx.getJsonBody<{ reviewerId?: string; note?: string }>()

			const { reviewerId, note } = body

			if (!reviewerId || !note) {
				return ctx.json(
					{ success: false, error: this.messages.missingRequiredFields() },
					400
				)
			}

			const refundDto = await this.refundService.rejectRefund(id!, reviewerId, note)

			return ctx.json({ success: true, data: refundDto, message: this.messages.rejectSuccess() })
		} catch (error) {
			const message = String(error)
			if (message.includes('不存在') || message.includes('not found')) {
				return ctx.json({ success: false, error: this.messages.notFound() }, 404)
			}
			return ctx.json({ success: false, error: message }, 400)
		}
	}

	/**
	 * 標記退貨已寄出
	 *
	 * POST /refunds/:id/ship
	 */
	async shipItems(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params
			const body = await ctx.getJsonBody<{ trackingNumber?: string }>()

			const refundDto = await this.refundService.markItemsShipped(id!, body.trackingNumber)

			return ctx.json({ success: true, data: refundDto, message: this.messages.itemsShippedSuccess() })
		} catch (error) {
			const message = String(error)
			if (message.includes('不存在') || message.includes('not found')) {
				return ctx.json({ success: false, error: this.messages.notFound() }, 404)
			}
			return ctx.json({ success: false, error: message }, 400)
		}
	}

	/**
	 * 確認已收到退貨商品
	 *
	 * POST /refunds/:id/receive
	 */
	async receiveItems(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params
			const body = await ctx.getJsonBody<{ conditions?: unknown[] }>()

			const conditions = body.conditions ?? []

			const refundDto = await this.refundService.confirmItemsReceived(id!, conditions as any[])

			return ctx.json({ success: true, data: refundDto, message: this.messages.itemsReceivedSuccess() })
		} catch (error) {
			const message = String(error)
			if (message.includes('不存在') || message.includes('not found')) {
				return ctx.json({ success: false, error: this.messages.notFound() }, 404)
			}
			return ctx.json({ success: false, error: message }, 400)
		}
	}

	/**
	 * 查詢待審核退款列表
	 *
	 * GET /refunds/pending-reviews
	 */
	async getPendingReviews(ctx: IHttpContext): Promise<Response> {
		try {
			const limitStr = ctx.query.limit
			const offsetStr = ctx.query.offset
			const pagination = {
				limit: limitStr ? Number(limitStr) : undefined,
				offset: offsetStr ? Number(offsetStr) : undefined,
			}

			const refunds = await this.queryService.getPendingReviews(pagination)

			return ctx.json({ success: true, data: refunds })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 500)
		}
	}
}
