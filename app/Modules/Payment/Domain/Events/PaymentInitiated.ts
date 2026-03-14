import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import type { PaymentId } from '../ValueObjects/PaymentId'
import type { Amount } from '../ValueObjects/Amount'
import type { PaymentMethod } from '../ValueObjects/PaymentMethod'

/**
 * 支付已建立事件
 */
export class PaymentInitiated extends DomainEvent {
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
