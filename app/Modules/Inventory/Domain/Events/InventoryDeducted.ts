/**
 * @file InventoryDeducted.ts
 * @description 庫存已扣減領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 庫存已扣減事件
 *
 * 當訂單支付成功時觸發，表示庫存從預留轉為已扣減。
 */
export class InventoryDeducted extends DomainEvent {
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
	): InventoryDeducted {
		return new InventoryDeducted(inventoryId, sku, amount, orderId)
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
