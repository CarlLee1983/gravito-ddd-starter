/**
 * @file PaymentId.ts
 * @description 支付唯一標識符值物件
 */

import { randomUUID } from 'crypto'

/**
 * 支付唯一標識符值物件
 */
export class PaymentId {
	private readonly _value: string

	/**
	 * @param value - 原始 ID 字串，若未提供則生成新的 UUID
	 */
	constructor(value?: string) {
		this._value = value || randomUUID()
	}

	/** 獲取 ID 字串值 */
	get value(): string {
		return this._value
	}

	/**
	 * 靜態工廠方法
	 *
	 * @param value - ID 字串
	 * @returns 支付 ID 值物件實例
	 */
	static from(value: string): PaymentId {
		return new PaymentId(value)
	}

	/**
	 * 檢查兩個 ID 是否相等
	 *
	 * @param other - 另一個支付 ID 值物件
	 * @returns 是否相等
	 */
	equals(other: PaymentId): boolean {
		return this._value === other._value
	}

	/**
	 * 轉換為字串
	 *
	 * @returns ID 字串
	 */
	toString(): string {
		return this._value
	}
}
