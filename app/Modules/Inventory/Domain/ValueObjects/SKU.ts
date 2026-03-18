/**
 * @file SKU.ts
 * @description 庫存項目的 SKU 值物件
 *
 * 代表商品的庫存狀態：總庫存、預留庫存、可用庫存。
 * 所有操作返回新實例（不可變模式）。
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface SKUProps extends Record<string, unknown> {
	readonly code: string
	readonly quantity: number // 總庫存
	readonly reserved: number // 預留庫存
}

/**
 * SKU 值物件
 *
 * 不可變設計：所有操作（reserve、deduct、restore）都返回新實例。
 * 確保庫存邏輯的安全性與可追蹤性。
 */
export class SKU extends ValueObject<SKUProps> {
	private constructor(props: SKUProps) {
		super(props)
	}

	get code(): string {
		return this.props.code
	}

	get quantity(): number {
		return this.props.quantity
	}

	get reserved(): number {
		return this.props.reserved
	}

	/**
	 * 可用庫存 = 總庫存 - 預留
	 */
	get available(): number {
		return this.quantity - this.reserved
	}

	toString(): string {
		return `SKU(${this.code}): quantity=${this.quantity}, reserved=${this.reserved}, available=${this.available}`
	}

	// ============================================
	// 工廠方法
	// ============================================

	/**
	 * 建立新的 SKU
	 *
	 * @param code - SKU 代碼（商品編碼）
	 * @param quantity - 初始庫存量
	 * @returns SKU 實例
	 * @throws Error 如果庫存量 < 0
	 */
	static create(code: string, quantity: number): SKU {
		if (quantity < 0) {
			throw new Error(`SKU 庫存不能為負數：${quantity}`)
		}

		return new SKU({
			code,
			quantity,
			reserved: 0,
		})
	}

	/**
	 * 從現有數據還原 SKU
	 */
	static reconstitute(code: string, quantity: number, reserved: number): SKU {
		if (quantity < 0) {
			throw new Error(`SKU 庫存不能為負數：${quantity}`)
		}

		if (reserved < 0 || reserved > quantity) {
			throw new Error(`SKU 預留庫存無效：reserved=${reserved}, quantity=${quantity}`)
		}

		return new SKU({
			code,
			quantity,
			reserved,
		})
	}

	// ============================================
	// 庫存操作（不可變）
	// ============================================

	/**
	 * 預留庫存
	 *
	 * 驗證可用庫存充足，返回新的 SKU 實例（預留 +N）
	 *
	 * @param amount - 預留數量
	 * @returns 新的 SKU 實例
	 * @throws Error 如果可用庫存不足
	 */
	reserve(amount: number): SKU {
		if (amount <= 0) {
			throw new Error('預留數量必須大於 0')
		}

		if (amount > this.available) {
			throw new Error(
				`可用庫存不足：需要 ${amount}，可用 ${this.available} (總庫存: ${this.quantity}, 已預留: ${this.reserved})`
			)
		}

		return new SKU({
			code: this.code,
			quantity: this.quantity,
			reserved: this.reserved + amount,
		})
	}

	/**
	 * 扣減庫存（確認預留為已售出）
	 *
	 * 驗證已預留庫存充足，返回新的 SKU 實例（總庫存 -N、預留 -N）
	 *
	 * @param amount - 扣減數量
	 * @returns 新的 SKU 實例
	 * @throws Error 如果預留庫存不足
	 */
	deduct(amount: number): SKU {
		if (amount <= 0) {
			throw new Error('扣減數量必須大於 0')
		}

		if (amount > this.reserved) {
			throw new Error(
				`預留庫存不足：需要 ${amount}，預留 ${this.reserved} (總庫存: ${this.quantity})`
			)
		}

		return new SKU({
			code: this.code,
			quantity: this.quantity - amount,
			reserved: this.reserved - amount,
		})
	}

	/**
	 * 釋放預留（取消訂單時）
	 *
	 * 返回新的 SKU 實例（預留 -N）
	 *
	 * @param amount - 釋放的預留數量
	 * @returns 新的 SKU 實例
	 * @throws Error 如果預留庫存不足
	 */
	release(amount: number): SKU {
		if (amount <= 0) {
			throw new Error('釋放數量必須大於 0')
		}

		if (amount > this.reserved) {
			throw new Error(
				`預留庫存不足：需要 ${amount}，預留 ${this.reserved} (總庫存: ${this.quantity})`
			)
		}

		return new SKU({
			code: this.code,
			quantity: this.quantity,
			reserved: this.reserved - amount,
		})
	}

	/**
	 * 補充庫存
	 *
	 * @param amount - 補充數量
	 * @returns 新的 SKU 實例
	 * @throws Error 如果數量 < 0
	 */
	replenish(amount: number): SKU {
		if (amount <= 0) {
			throw new Error('補充數量必須大於 0')
		}

		return new SKU({
			code: this.code,
			quantity: this.quantity + amount,
			reserved: this.reserved,
		})
	}

	// ============================================
	// 查詢方法
	// ============================================

	/**
	 * 可用庫存是否充足
	 */
	hasAvailable(amount: number): boolean {
		return amount <= this.available
	}

	/**
	 * 相等性檢查
	 */
	equals(other: SKU): boolean {
		return this.code === other.code && this.quantity === other.quantity && this.reserved === other.reserved
	}
}
