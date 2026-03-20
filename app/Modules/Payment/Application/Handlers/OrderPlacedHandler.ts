/**
 * @file OrderPlacedHandler.ts
 * @description 訂單建立事件處理器
 *
 * 監聽 OrderPlaced 事件，自動發起支付
 */

import type { InitiatePaymentService } from '../Services/InitiatePaymentService'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

/**
 * 訂單建立事件處理器
 *
 * 當訂單模組發佈 OrderPlaced 事件時：
 * 1. 提取事件資料（orderId、userId、amount、currency）
 * 2. 呼叫 InitiatePaymentService.execute()
 * 3. 建立新的支付聚合根
 */
export class OrderPlacedHandler {
	constructor(
		private initiatePaymentService: InitiatePaymentService,
		private logger?: ILogger
	) {}

	async handle(event: any): Promise<void> {
		try {
			const orderId = event.orderId || event.data?.orderId
			const userId = event.userId || event.data?.userId
			const amount = event.data?.total || event.total || event.amount
			const currency = event.data?.currency || event.currency || 'TWD'

			this.logger?.info(
				`[OrderPlacedHandler] 處理 OrderPlaced 事件: orderId=${orderId}, amount=${amount}`
			)

			if (!orderId || !userId) {
				this.logger?.warn('[OrderPlacedHandler] 缺少 orderId 或 userId，無法處理事件')
				return
			}

			// 發起支付
			await this.initiatePaymentService.execute({
				orderId,
				userId,
				amountCents: amount,
				paymentMethod: 'credit_card',
			})

			this.logger?.info(
				`[OrderPlacedHandler] 支付已發起: orderId=${orderId}`
			)
		} catch (error) {
			this.logger?.error(
				'[OrderPlacedHandler] 發起支付失敗',
				error as Error
			)
			throw error
		}
	}
}
