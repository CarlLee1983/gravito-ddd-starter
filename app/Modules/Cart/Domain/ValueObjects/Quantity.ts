/**
 * @file Quantity.ts
 * @description 購物車項目數量值物件
 */

import { ValueObject } from '@/Shared/Domain/ValueObject'

interface QuantityProps extends Record<string, unknown> {
	readonly value: number
}

/**
 * 數量值物件 - 1-99 範圍內
 *
 * 確保購物車內單一商品數量有效
 */
export class Quantity extends ValueObject<QuantityProps> {
	private constructor(props: QuantityProps) {
		super(props)
	}

	get value(): number {
		return this.props.value
	}

	toString(): string {
		return String(this.props.value)
	}

	/**
	 * 建立數量值物件
	 *
	 * @param value - 數量（1-99）
	 * @returns Quantity 實例
	 * @throws Error 如果數量不在有效範圍內
	 */
	static create(value: number): Quantity {
		const num = Math.floor(value)

		if (num < 1) {
			throw new Error('數量不能少於 1')
		}

		if (num > 99) {
			throw new Error('數量不能超過 99')
		}

		return new Quantity({ value: num })
	}

	equals(other: Quantity): boolean {
		return this.props.value === other.props.value
	}

	/**
	 * 增加數量
	 *
	 * @param delta - 增量
	 * @returns 新的 Quantity 實例
	 */
	add(delta: Quantity): Quantity {
		return Quantity.create(this.props.value + delta.props.value)
	}

	/**
	 * 減少數量
	 *
	 * @param delta - 減量
	 * @returns 新的 Quantity 實例
	 */
	subtract(delta: Quantity): Quantity {
		return Quantity.create(this.props.value - delta.props.value)
	}
}
