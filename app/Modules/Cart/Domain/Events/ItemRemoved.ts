/**
 * @file ItemRemoved.ts
 * @description 商品移除購物車事件
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 商品已移除購物車事件
 */
export class ItemRemoved extends DomainEvent {
	constructor(
		public readonly cartId: string,
		public readonly productId: string,
		occurredAt: Date = new Date()
	) {
		super(cartId, 'ItemRemoved', { productId }, 1, occurredAt)
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
				productId: this.productId,
			},
		}
	}
}
