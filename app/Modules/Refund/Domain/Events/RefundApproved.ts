import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundApproved extends DomainEvent {
	constructor(
		refundId: string,
		policyType: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundApproved', { policyType }, 1, occurredAt)
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
