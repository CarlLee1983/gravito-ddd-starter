import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundRequested extends DomainEvent {
	constructor(
		refundId: string,
		orderId: string,
		userId: string,
		type: string,
		itemCount: number,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundRequested', { orderId, userId, type, itemCount }, 1, occurredAt)
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
