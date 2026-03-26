import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundManualReviewRequired extends DomainEvent {
	constructor(
		refundId: string,
		reason: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundManualReviewRequired', { reason }, 1, occurredAt)
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
