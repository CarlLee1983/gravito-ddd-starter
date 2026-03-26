/**
 * @file PaymentRefundHandler.ts
 * @description 支付退款事件處理器 — 監聽 PaymentRefunded / PaymentRefundFailed
 *
 * 當支付模組完成退款時，更新 Refund 聚合根狀態：
 * - PaymentRefunded → Refund.complete()
 * - PaymentRefundFailed → Refund.fail(reason)
 */

import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

/**
 * 支付退款事件處理器
 */
export class PaymentRefundHandler {
	constructor(
		private readonly refundRepository: IRefundRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * 處理支付退款完成事件
	 *
	 * @param event - PaymentRefunded 整合事件
	 */
	async handlePaymentRefunded(event: any): Promise<void> {
		const data = event.data ?? event

		const refundId = data.refundId ?? data.aggregateId
		if (!refundId) {
			this.logger.warn?.('[PaymentRefundHandler] PaymentRefunded: missing refundId')
			return
		}

		try {
			const refund = await this.refundRepository.findById(String(refundId))
			if (!refund) {
				this.logger.warn?.(`[PaymentRefundHandler] Refund not found: ${refundId}`)
				return
			}

			refund.complete()
			await this.refundRepository.save(refund)

			this.logger.info?.(`[PaymentRefundHandler] Refund completed: ${refundId}`)
		} catch (error) {
			this.logger.error?.(
				`[PaymentRefundHandler] Failed to complete refund: ${refundId}`,
				error
			)
		}
	}

	/**
	 * 處理支付退款失敗事件
	 *
	 * @param event - PaymentRefundFailed 整合事件
	 */
	async handlePaymentRefundFailed(event: any): Promise<void> {
		const data = event.data ?? event

		const refundId = data.refundId ?? data.aggregateId
		const reason = data.reason ?? data.failureReason ?? '支付退款失敗'

		if (!refundId) {
			this.logger.warn?.('[PaymentRefundHandler] PaymentRefundFailed: missing refundId')
			return
		}

		try {
			const refund = await this.refundRepository.findById(String(refundId))
			if (!refund) {
				this.logger.warn?.(`[PaymentRefundHandler] Refund not found: ${refundId}`)
				return
			}

			refund.fail(String(reason))
			await this.refundRepository.save(refund)

			this.logger.info?.(`[PaymentRefundHandler] Refund marked as failed: ${refundId}`)
		} catch (error) {
			this.logger.error?.(
				`[PaymentRefundHandler] Failed to mark refund as failed: ${refundId}`,
				error
			)
		}
	}
}
