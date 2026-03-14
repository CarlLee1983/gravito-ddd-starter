import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import type { PaymentId } from '../ValueObjects/PaymentId'

/**
 * 支付失敗事件
 */
export class PaymentFailed extends DomainEvent {
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
