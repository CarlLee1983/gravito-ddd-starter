import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class ReturnItemsShipped extends DomainEvent {
	constructor(
		refundId: string,
		trackingNumber: string | null,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'ReturnItemsShipped', { trackingNumber }, 1, occurredAt)
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
