/**
 * @file CartCheckoutRequested.ts
 * @description 購物車結帳請求事件
 *
 * 此事件用於跨 Bounded Context 通知（供 Order Context 監聽）
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export interface CartItem {
	productId: string
	quantity: number
	price: number
}

/**
 * 購物車結帳請求事件
 *
 * 表示使用者要求結帳，Order Context 可監聽此事件建立訂單
 */
export class CartCheckoutRequested extends DomainEvent {
	constructor(
		public readonly cartId: string,
		public readonly userId: string,
		public readonly items: CartItem[],
		public readonly totalAmount: number,
		occurredAt: Date = new Date()
	) {
		super(cartId, 'CartCheckoutRequested', { userId, items, totalAmount }, 1, occurredAt)
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
				items: this.items,
				totalAmount: this.totalAmount,
			},
		}
	}
}
