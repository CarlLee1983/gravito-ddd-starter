import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundRejected extends DomainEvent {
	constructor(
		refundId: string,
		reviewerId: string,
		note: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundRejected', { reviewerId, note }, 1, occurredAt)
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
