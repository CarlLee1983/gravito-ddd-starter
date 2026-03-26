import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundCompleted extends DomainEvent {
	constructor(
		refundId: string,
		orderId: string,
		refundAmountCents: number,
		currency: string,
		occurredAt: Date = new Date(),
	) {
		super(
			refundId,
			'RefundCompleted',
			{ orderId, refundAmountCents, currency },
			1,
			occurredAt,
		)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId,
			aggregateId: this.aggregateId,
			eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(),
			version: this.version,
			data: { ...this.data },
		}
	}
}
