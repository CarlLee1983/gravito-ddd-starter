import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class ReturnItemsReceived extends DomainEvent {
	constructor(
		refundId: string,
		itemConditions: Array<{ returnItemId: string; condition: string }>,
		occurredAt: Date = new Date(),
	) {
		super(
			refundId,
			'ReturnItemsReceived',
			{ itemConditions: JSON.stringify(itemConditions) },
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
