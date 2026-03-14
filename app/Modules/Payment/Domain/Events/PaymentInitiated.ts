/**
 * @file PaymentInitiated.ts
 * @description 支付已發起領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import type { PaymentId } from '../ValueObjects/PaymentId'
import type { Amount } from '../ValueObjects/Amount'
import type { PaymentMethod } from '../ValueObjects/PaymentMethod'

/**
 * 支付已建立事件
 */
export class PaymentInitiated extends DomainEvent {
	/**
	 * @param paymentId - 支付 ID
	 * @param orderId - 訂單 ID
	 * @param userId - 用戶 ID
	 * @param amount - 金額值物件
	 * @param paymentMethod - 支付方式值物件
	 * @param metadata - 額外元數據
	 */
	constructor(
		public readonly paymentId: PaymentId,
		public readonly orderId: string,
		public readonly userId: string,
		public readonly amount: Amount,
		public readonly paymentMethod: PaymentMethod,
		public readonly metadata?: Record<string, any>
	) {
		super(
			paymentId.value,
			'PaymentInitiated',
			{
				orderId,
				userId,
				amountCents: amount.cents,
				paymentMethod: paymentMethod.type,
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
				userId: this.userId,
				amountCents: this.amount.cents,
				paymentMethod: this.paymentMethod.type,
				metadata: this.metadata
			}
		}
	}
}
