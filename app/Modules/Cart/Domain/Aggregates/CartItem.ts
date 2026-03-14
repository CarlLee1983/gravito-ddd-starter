/**
 * @file CartItem.ts
 * @description 購物車項目實體（非聚合根，內部實體）
 */

import { BaseEntity } from '@/Foundation/Domain/BaseEntity'
import { CartItemId } from '../ValueObjects/CartItemId'
import { Quantity } from '../ValueObjects/Quantity'

/**
 * 購物車項目實體
 *
 * 作為 Cart 聚合根的內部實體，不應在聚合根外部直接使用
 */
export class CartItem extends BaseEntity {
	private constructor(
		id: CartItemId,
		private _productId: string,
		private _quantity: Quantity,
		private _price: number,
		createdAt: Date = new Date()
	) {
		super(id.value)
		this._createdAt = createdAt
	}

	/**
	 * 建立購物車項目
	 *
	 * @param cartId - 購物車 ID
	 * @param productId - 商品 ID
	 * @param quantity - 數量
	 * @param price - 單位價格
	 * @returns CartItem 實例
	 */
	static create(cartId: string, productId: string, quantity: Quantity, price: number): CartItem {
		if (price <= 0) {
			throw new Error('商品價格必須大於 0')
		}

		return new CartItem(
			CartItemId.create(cartId, productId),
			productId,
			quantity,
			price
		)
	}

	/**
	 * 從資料庫還原
	 */
	static reconstitute(
		cartId: string,
		productId: string,
		quantity: number,
		price: number,
		createdAt: Date
	): CartItem {
		return new CartItem(
			CartItemId.create(cartId, productId),
			productId,
			Quantity.create(quantity),
			price,
			new Date(createdAt.getTime())
		)
	}

	// Getters
	get productId(): string {
		return this._productId
	}

	get quantity(): Quantity {
		return this._quantity
	}

	get price(): number {
		return this._price
	}

	get createdAt(): Date {
		return new Date(this._createdAt.getTime())
	}

	/**
	 * 計算此項目的小計
	 */
	getSubtotal(): number {
		return this._quantity.value * this._price
	}

	/**
	 * 更新數量
	 *
	 * @param newQuantity - 新的數量
	 * @returns 數量是否變更
	 */
	updateQuantity(newQuantity: Quantity): boolean {
		if (this._quantity.equals(newQuantity)) {
			return false
		}
		this._quantity = newQuantity
		return true
	}
}
