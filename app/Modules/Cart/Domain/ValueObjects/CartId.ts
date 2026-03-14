/**
 * @file CartId.ts
 * @description 購物車識別符值物件
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface CartIdProps extends Record<string, unknown> {
	readonly value: string
}

/**
 * 購物車 ID 值物件
 *
 * 由 userId + "_cart" 組成，確保每個用戶只有一個購物車
 */
export class CartId extends ValueObject<CartIdProps> {
	private constructor(props: CartIdProps) {
		super(props)
	}

	get value(): string {
		return this.props.value
	}

	toString(): string {
		return this.props.value
	}

	/**
	 * 為使用者建立購物車 ID
	 *
	 * @param userId - 使用者 ID
	 * @returns CartId 實例
	 */
	static forUser(userId: string): CartId {
		if (!userId || userId.trim().length === 0) {
			throw new Error('使用者 ID 不能為空')
		}
		return new CartId({ value: `${userId}_cart` })
	}

	/**
	 * 從原始值建立購物車 ID
	 *
	 * @param value - 購物車 ID 原始值
	 * @returns CartId 實例
	 */
	static create(value: string): CartId {
		if (!value || value.trim().length === 0) {
			throw new Error('購物車 ID 不能為空')
		}
		return new CartId({ value })
	}

	/**
	 * 提取使用者 ID
	 *
	 * @returns 使用者 ID
	 */
	getUserId(): string {
		return this.props.value.replace('_cart', '')
	}

	equals(other: CartId): boolean {
		return this.props.value === other.props.value
	}
}
