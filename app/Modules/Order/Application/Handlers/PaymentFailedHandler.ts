/**
 * @file PaymentFailedHandler.ts
 * @description 支付失敗事件處理器
 *
 * 監聽 PaymentFailed 事件，取消訂單
 */

import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

/**
 * 支付失敗事件處理器
 *
 * 當支付模組發佈 PaymentFailed 事件時：
 * 1. 根據 orderId 查找訂單
 * 2. 呼叫 order.cancel() 更新訂單狀態為 CANCELLED
 * 3. 持久化更新後的訂單
 */
export class PaymentFailedHandler {
	constructor(
		private orderRepository: IOrderRepository,
		private logger?: ILogger
	) {}

	async handle(event: any): Promise<void> {
		try {
			const orderId = event.orderId || event.data?.orderId
			const reason = event.reason || event.data?.reason || '支付失敗'

			this.logger?.info(
				`[PaymentFailedHandler] 處理 PaymentFailed 事件: orderId=${orderId}, reason=${reason}`
			)

			if (!orderId) {
				this.logger?.warn('[PaymentFailedHandler] 缺少 orderId，無法處理事件')
				return
			}

			// 查找訂單
			const order = await this.orderRepository.findById(orderId)
			if (!order) {
				this.logger?.warn(`[PaymentFailedHandler] 訂單不存在: ${orderId}`)
				return
			}

			// 取消訂單
			order.cancel(reason)
			await this.orderRepository.update(order)

			this.logger?.info(
				`[PaymentFailedHandler] 訂單已取消: ${orderId}`
			)
		} catch (error) {
			this.logger?.error(
				'[PaymentFailedHandler] 取消訂單失敗',
				error as Error
			)
			throw error
		}
	}
}
