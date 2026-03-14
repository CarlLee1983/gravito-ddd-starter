/**
 * @file CartCreated.ts
 * @description 購物車建立事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 購物車已建立事件
 *
 * 表示新使用者的購物車已初始化
 */
export class CartCreated extends DomainEvent {
	constructor(
		public readonly cartId: string,
		public readonly userId: string,
		occurredAt: Date = new Date()
	) {
		super(cartId, 'CartCreated', { userId }, 1, occurredAt)
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
				userId: this.userId,
			},
		}
	}
}
