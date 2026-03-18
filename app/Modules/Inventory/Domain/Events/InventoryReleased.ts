/**
 * @file InventoryReleased.ts
 * @description 庫存已釋放領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 庫存已釋放事件
 *
 * 當訂單失敗/取消時觸發，表示預留的庫存已釋放回可用池。
 * 用於 Saga 補償流程。
 */
export class InventoryReleased extends DomainEvent {
	constructor(
		readonly inventoryId: string,
		readonly sku: string,
		readonly amount: number,
		readonly orderId: string,
		readonly reason: string = 'order_cancelled'
	) {
		super()
	}

	static create(
		inventoryId: string,
		sku: string,
		amount: number,
		orderId: string,
		reason: string = 'order_cancelled'
	): InventoryReleased {
		return new InventoryReleased(inventoryId, sku, amount, orderId, reason)
	}

	override toJSON(): Record<string, unknown> {
		return {
			...super.toJSON(),
			inventoryId: this.inventoryId,
			sku: this.sku,
			amount: this.amount,
			orderId: this.orderId,
			reason: this.reason,
		}
	}
}
