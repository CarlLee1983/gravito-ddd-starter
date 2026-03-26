import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundAutoApproved extends DomainEvent {
	constructor(
		refundId: string,
		rule: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundAutoApproved', { rule }, 1, occurredAt)
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
