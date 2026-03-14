import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import type { PaymentId } from '../ValueObjects/PaymentId'
import type { TransactionId } from '../ValueObjects/TransactionId'

/**
 * 支付成功事件
 */
export class PaymentSucceeded extends DomainEvent {
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
