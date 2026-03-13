/**
 * @file CartCleared.ts
 * @description 購物車清空事件
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 購物車已清空事件
 */
export class CartCleared extends DomainEvent {
	constructor(
		public readonly cartId: string,
		occurredAt: Date = new Date()
	) {
		super(cartId, 'CartCleared', {}, 1, occurredAt)
	}

	toJSON() {
		return {
			eventId: this.eventId,
			aggregateId: this.cartId,
			eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(),
			version: this.version,
			data: {
				cartId: this.cartId,
			},
		}
	}
}
