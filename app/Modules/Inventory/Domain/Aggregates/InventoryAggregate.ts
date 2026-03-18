/**
 * @file InventoryAggregate.ts
 * @description 庫存聚合根
 *
 * 管理商品的庫存狀態：總庫存、預留、已扣減。
 * 支援樂觀鎖版本號，防止並發衝突。
 */

import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import { SKU } from '../ValueObjects/SKU'
import { InventoryReserved } from '../Events/InventoryReserved'
import { InventoryDeducted } from '../Events/InventoryDeducted'
import { InventoryReleased } from '../Events/InventoryReleased'

/**
 * 庫存聚合根
 *
 * 追蹤單個商品的庫存狀態。支援樂觀鎖版本號防止並發衝突。
 *
 * **狀態**:
 * - version: 樂觀鎖版本號
 * - sku: SKU 值物件（包含 code、quantity、reserved）
 * - createdAt: 庫存記錄建立時間
 */
export class InventoryAggregate extends AggregateRoot {
	private _sku!: SKU
	private _version: number = 0
	private _createdAt!: Date

	/**
	 * 私有建構子，強制使用工廠方法
	 */
	private constructor(id: string) {
		super(id)
	}

	// ============================================
	// Getter 方法
	// ============================================

	get sku(): SKU {
		return this._sku
	}

	get version(): number {
		return this._version
	}

	get createdAt(): Date {
		return this._createdAt
	}

	get skuCode(): string {
		return this._sku.code
	}

	get quantity(): number {
		return this._sku.quantity
	}

	get reserved(): number {
		return this._sku.reserved
	}

	get available(): number {
		return this._sku.available
	}

	// ============================================
	// 工廠方法
	// ============================================

	/**
	 * 建立新的庫存聚合根
	 *
	 * @param inventoryId - 庫存 ID（通常 = productId）
	 * @param skuCode - 商品 SKU 代碼
	 * @param initialQuantity - 初始庫存量
	 * @returns 新的 InventoryAggregate（包含未提交事件）
	 */
	static create(inventoryId: string, skuCode: string, initialQuantity: number): InventoryAggregate {
		const agg = new InventoryAggregate(inventoryId)
		agg._sku = SKU.create(skuCode, initialQuantity)
		agg._createdAt = new Date()
		agg._version = 0

		// 不產生事件，因為這是初始化
		return agg
	}

	/**
	 * 從數據庫還原聚合根
	 *
	 * @param inventoryId - 庫存 ID
	 * @param skuCode - SKU 代碼
	 * @param quantity - 總庫存
	 * @param reserved - 已預留庫存
	 * @param createdAt - 建立時間
	 * @param version - 版本號
	 * @returns 還原後的 InventoryAggregate
	 */
	static reconstitute(
		inventoryId: string,
		skuCode: string,
		quantity: number,
		reserved: number,
		createdAt: Date,
		version: number
	): InventoryAggregate {
		const agg = new InventoryAggregate(inventoryId)
		agg._sku = SKU.reconstitute(skuCode, quantity, reserved)
		agg._createdAt = createdAt
		agg._version = version

		return agg
	}

	// ============================================
	// 業務操作
	// ============================================

	/**
	 * 預留庫存（購物車結帳時）
	 *
	 * 驗證可用庫存充足，產生 InventoryReserved 事件。
	 * applyEvent 會實際套用狀態變更，不在此直接應用。
	 *
	 * @param amount - 預留數量
	 * @param orderId - 訂單 ID（用於追蹤）
	 * @throws Error 如果可用庫存不足
	 */
	reserve(amount: number, orderId: string): void {
		// 驗證可用庫存充足（先檢查，再產生事件）
		if (amount <= 0) {
			throw new Error('預留數量必須大於 0')
		}

		if (amount > this.available) {
			throw new Error(
				`可用庫存不足：需要 ${amount}，可用 ${this.available} (總庫存: ${this.quantity}, 已預留: ${this.reserved})`
			)
		}

		// 只產生事件，不直接修改狀態
		// applyEvent() 會負責實際套用狀態變更
		this.raiseEvent(InventoryReserved.create(this.id, this.skuCode, amount, orderId))
	}

	/**
	 * 扣減庫存（訂單支付成功時）
	 *
	 * 將預留的庫存確認為已扣減，產生 InventoryDeducted 事件。
	 * applyEvent 會實際套用狀態變更，不在此直接應用。
	 *
	 * @param amount - 扣減數量
	 * @param orderId - 訂單 ID
	 * @throws Error 如果預留庫存不足
	 */
	deduct(amount: number, orderId: string): void {
		// 驗證預留庫存充足
		if (amount <= 0) {
			throw new Error('扣減數量必須大於 0')
		}

		if (amount > this.reserved) {
			throw new Error(
				`預留庫存不足：需要 ${amount}，預留 ${this.reserved} (總庫存: ${this.quantity})`
			)
		}

		// 只產生事件，不直接修改狀態
		// applyEvent() 會負責實際套用狀態變更
		this.raiseEvent(InventoryDeducted.create(this.id, this.skuCode, amount, orderId))
	}

	/**
	 * 釋放預留（訂單取消/失敗時 - Saga 補償）
	 *
	 * 釋放預留的庫存回可用池，產生 InventoryReleased 事件。
	 * applyEvent 會實際套用狀態變更，不在此直接應用。
	 *
	 * @param amount - 釋放數量
	 * @param orderId - 訂單 ID
	 * @param reason - 釋放原因（預設 'order_cancelled'）
	 * @throws Error 如果預留庫存不足
	 */
	release(amount: number, orderId: string, reason: string = 'order_cancelled'): void {
		// 驗證預留庫存充足
		if (amount <= 0) {
			throw new Error('釋放數量必須大於 0')
		}

		if (amount > this.reserved) {
			throw new Error(
				`預留庫存不足：需要 ${amount}，預留 ${this.reserved} (總庫存: ${this.quantity})`
			)
		}

		// 只產生事件，不直接修改狀態
		// applyEvent() 會負責實際套用狀態變更
		this.raiseEvent(InventoryReleased.create(this.id, this.skuCode, amount, orderId, reason))
	}

	/**
	 * 補充庫存
	 *
	 * @param amount - 補充數量
	 */
	replenish(amount: number): void {
		const newSku = this._sku.replenish(amount)
		this._sku = newSku
	}

	// ============================================
	// 查詢方法
	// ============================================

	/**
	 * 檢查可用庫存是否充足
	 */
	hasAvailable(amount: number): boolean {
		return this._sku.hasAvailable(amount)
	}

	/**
	 * 轉換為 JSON（用於序列化）
	 */
	toJSON(): Record<string, unknown> {
		return {
			id: this.id,
			skuCode: this.skuCode,
			quantity: this.quantity,
			reserved: this.reserved,
			available: this.available,
			createdAt: this.createdAt.toISOString(),
			version: this.version,
		}
	}

	// ============================================
	// Event Sourcing 支援
	// ============================================

	/**
	 * 應用事件到聚合根（用於事件溯源重構）
	 *
	 * @param event - 領域事件
	 *
	 * 注意：_version 只追蹤資料庫版本（樂觀鎖），不在這裡遞增。
	 * AggregateRoot.appliedEventCount 會自動追蹤事件計數。
	 */
	applyEvent(event: any): void {
		if (event instanceof InventoryReserved) {
			this._sku = this._sku.reserve(event.amount)
		} else if (event instanceof InventoryDeducted) {
			this._sku = this._sku.deduct(event.amount)
		} else if (event instanceof InventoryReleased) {
			this._sku = this._sku.release(event.amount)
		}

		// _version 只由 Repository 管理，不在此遞增
	}
}
