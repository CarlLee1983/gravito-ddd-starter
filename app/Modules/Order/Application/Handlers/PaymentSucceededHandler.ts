/**
 * @file PaymentSucceededHandler.ts
 * @description 支付成功事件處理器
 *
 * 監聽 PaymentSucceeded 事件，確認訂單
 */

import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

/**
 * 支付成功事件處理器
 *
 * 當支付模組發佈 PaymentSucceeded 事件時：
 * 1. 根據 orderId 查找訂單
 * 2. 呼叫 order.confirm() 更新訂單狀態為 CONFIRMED
 * 3. 持久化更新後的訂單
 */
export class PaymentSucceededHandler {
	constructor(
		private orderRepository: IOrderRepository,
		private logger?: ILogger
	) {}

	async handle(event: any): Promise<void> {
		try {
			const orderId = event.orderId || event.data?.orderId

			this.logger?.info(
				`[PaymentSucceededHandler] 處理 PaymentSucceeded 事件: orderId=${orderId}`
			)

			if (!orderId) {
				this.logger?.warn('[PaymentSucceededHandler] 缺少 orderId，無法處理事件')
				return
			}

			// 查找訂單
			const order = await this.orderRepository.findById(orderId)
			if (!order) {
				this.logger?.warn(`[PaymentSucceededHandler] 訂單不存在: ${orderId}`)
				return
			}

			// 確認訂單
			order.confirm()
			await this.orderRepository.update(order)

			this.logger?.info(
				`[PaymentSucceededHandler] 訂單已確認: ${orderId}`
			)
		} catch (error) {
			this.logger?.error(
				'[PaymentSucceededHandler] 確認訂單失敗',
				error as Error
			)
			throw error
		}
	}
}
