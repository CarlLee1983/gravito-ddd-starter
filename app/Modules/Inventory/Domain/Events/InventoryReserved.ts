/**
 * @file InventoryReserved.ts
 * @description 庫存已預留領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 庫存已預留事件
 *
 * 當購物車結帳時觸發，表示庫存已預留給特定訂單。
 */
export class InventoryReserved extends DomainEvent {
	constructor(
		readonly inventoryId: string,
		readonly sku: string,
		readonly amount: number,
		readonly orderId: string
	) {
		super()
	}

	static create(
		inventoryId: string,
		sku: string,
		amount: number,
		orderId: string
	): InventoryReserved {
		return new InventoryReserved(inventoryId, sku, amount, orderId)
	}

	override toJSON(): Record<string, unknown> {
		return {
			...super.toJSON(),
			inventoryId: this.inventoryId,
			sku: this.sku,
			amount: this.amount,
			orderId: this.orderId,
		}
	}
}
