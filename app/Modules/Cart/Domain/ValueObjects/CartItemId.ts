/**
 * @file CartItemId.ts
 * @description 購物車項目識別符值物件
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface CartItemIdProps extends Record<string, unknown> {
	readonly value: string
}

/**
 * 購物車項目 ID 值物件
 *
 * 由購物車 ID + productId 組成，確保購物車內項目唯一
 */
export class CartItemId extends ValueObject<CartItemIdProps> {
	private constructor(props: CartItemIdProps) {
		super(props)
	}

	get value(): string {
		return this.props.value
	}

	toString(): string {
		return this.props.value
	}

	/**
	 * 為購物車項目建立 ID
	 *
	 * @param cartId - 購物車 ID（如 "user123_cart"）
	 * @param productId - 商品 ID
	 * @returns CartItemId 實例
	 */
	static create(cartId: string, productId: string): CartItemId {
		if (!cartId || !productId) {
			throw new Error('購物車 ID 和商品 ID 不能為空')
		}
		return new CartItemId({ value: `${cartId}#${productId}` })
	}

	equals(other: CartItemId): boolean {
		return this.props.value === other.props.value
	}
}
