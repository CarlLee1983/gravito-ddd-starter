import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundProcessing extends DomainEvent {
	constructor(
		refundId: string,
		refundAmountCents: number,
		currency: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundProcessing', { refundAmountCents, currency }, 1, occurredAt)
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
