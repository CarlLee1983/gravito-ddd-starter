/**
 * @file PaymentFailed.ts
 * @description 支付失敗領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import type { PaymentId } from '../ValueObjects/PaymentId'

/**
 * 支付失敗事件
 */
export class PaymentFailed extends DomainEvent {
	/**
	 * @param paymentId - 支付 ID
	 * @param orderId - 訂單 ID
	 * @param reason - 失敗原因
	 * @param metadata - 額外元數據
	 */
	constructor(
		public readonly paymentId: PaymentId,
		public readonly orderId: string,
		public readonly reason: string,
		public readonly metadata?: Record<string, any>
	) {
		super(
			paymentId.value,
			'PaymentFailed',
			{
				orderId,
				reason,
				metadata
			}
		)
	}

	/**
	 * 序列化為 JSON 對象
	 *
	 * @returns 序列化後的物件
	 */
	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId,
			aggregateId: this.paymentId.value,
			eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(),
			version: this.version,
			data: {
				orderId: this.orderId,
				reason: this.reason,
				metadata: this.metadata
			}
		}
	}
}
