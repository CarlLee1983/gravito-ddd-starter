/**
 * @file ItemQuantityChanged.ts
 * @description 購物車項目數量變更事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 購物車項目數量已變更事件
 */
export class ItemQuantityChanged extends DomainEvent {
	constructor(
		public readonly cartId: string,
		public readonly productId: string,
		public readonly oldQuantity: number,
		public readonly newQuantity: number,
		occurredAt: Date = new Date()
	) {
		super(cartId, 'ItemQuantityChanged', { productId, oldQuantity, newQuantity }, 1, occurredAt)
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
				oldQuantity: this.oldQuantity,
				newQuantity: this.newQuantity,
			},
		}
	}
}
