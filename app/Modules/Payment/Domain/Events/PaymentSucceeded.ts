/**
 * @file PaymentSucceeded.ts
 * @description 支付成功領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import type { PaymentId } from '../ValueObjects/PaymentId'
import type { TransactionId } from '../ValueObjects/TransactionId'

/**
 * 支付成功事件
 */
export class PaymentSucceeded extends DomainEvent {
	/**
	 * @param paymentId - 支付 ID
	 * @param orderId - 訂單 ID
	 * @param transactionId - 交易流水號值物件
	 * @param metadata - 額外元數據
	 */
	constructor(
		public readonly paymentId: PaymentId,
		public readonly orderId: string,
		public readonly transactionId: TransactionId,
		public readonly metadata?: Record<string, any>
	) {
		super(
			paymentId.value,
			'PaymentSucceeded',
			{
				orderId,
				transactionId: transactionId.value,
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
				transactionId: this.transactionId.value,
				metadata: this.metadata
			}
		}
	}
}
