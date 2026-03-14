/**
 * @file ItemAdded.ts
 * @description 商品加入購物車事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 商品已加入購物車事件
 */
export class ItemAdded extends DomainEvent {
	constructor(
		public readonly cartId: string,
		public readonly productId: string,
		public readonly quantity: number,
		public readonly price: number,
		occurredAt: Date = new Date()
	) {
		super(cartId, 'ItemAdded', { productId, quantity, price }, 1, occurredAt)
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
				quantity: this.quantity,
				price: this.price,
			},
		}
	}
}
