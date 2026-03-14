/**
 * @file Cart.ts
 * @description 購物車聚合根 (Aggregate Root)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：系統的核心業務邏輯模型。
 * - 職責：封裝購物車的狀態與業務規則，確保資料的一致性與完整性。
 */

import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import { CartId } from '../ValueObjects/CartId'
import { Quantity } from '../ValueObjects/Quantity'
import { CartItem } from './CartItem'
import { CartCreated } from '../Events/CartCreated'
import { ItemAdded } from '../Events/ItemAdded'
import { ItemRemoved } from '../Events/ItemRemoved'
import { ItemQuantityChanged } from '../Events/ItemQuantityChanged'
import { CartCleared } from '../Events/CartCleared'
import { CartCheckoutRequested } from '../Events/CartCheckoutRequested'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 購物車聚合根
 *
 * 在 DDD 中代表購物車業務實體，負責確保購物車資料的完整性和一致性。
 * 所有狀態變更均通過事件驅動，不允許直接修改屬性。
 */
export class Cart extends AggregateRoot {
	private _cartId!: CartId
	private _userId!: string
	private _items: Map<string, CartItem> = new Map()
	protected _createdAt!: Date

	/**
	 * 私有建構子，強制使用靜態工廠方法
	 *
	 * @param id - 購物車唯一識別碼
	 * @private
	 */
	private constructor(id: string) {
		super(id)
	}

	/**
	 * 建立新的購物車聚合根（產生事件）
	 *
	 * @param cartId - 購物車 ID (userId + "_cart")
	 * @param userId - 使用者 ID
	 * @returns 新的 Cart 實體（包含未提交事件）
	 */
	static create(cartId: string, userId: string): Cart {
		const cart = new Cart(cartId)
		cart.raiseEvent(new CartCreated(cartId, userId))
		return cart
	}

	/**
	 * 從儲存的資料還原聚合根（無事件）
	 *
	 * @param cartId - 購物車 ID
	 * @param userId - 使用者 ID
	 * @param createdAt - 建立時間
	 * @param items - 購物車項目
	 * @returns 還原後的 Cart 實體
	 */
	static reconstitute(
		cartId: string,
		userId: string,
		createdAt: Date,
		items: Array<{ productId: string; quantity: number; price: number; createdAt: Date }>
	): Cart {
		const cart = new Cart(cartId)
		cart._cartId = CartId.create(cartId)
		cart._userId = userId
		cart._createdAt = new Date(createdAt.getTime())

		for (const item of items) {
			const cartItem = CartItem.reconstitute(
				cartId,
				item.productId,
				item.quantity,
				item.price,
				item.createdAt
			)
			cart._items.set(item.productId, cartItem)
		}

		return cart
	}

	/**
	 * 實作 AggregateRoot 的抽象方法：定義事件如何影響狀態
	 */
	applyEvent(event: DomainEvent): void {
		if (event instanceof CartCreated) {
			this._cartId = CartId.create(event.cartId)
			this._userId = event.userId
			this._createdAt = new Date(event.occurredAt.getTime())
		} else if (event instanceof ItemAdded) {
			const item = CartItem.create(
				event.cartId,
				event.productId,
				Quantity.create(event.quantity),
				event.price
			)
			this._items.set(event.productId, item)
		} else if (event instanceof ItemRemoved) {
			this._items.delete(event.productId)
		} else if (event instanceof ItemQuantityChanged) {
			const item = this._items.get(event.productId)
			if (item) {
				item.updateQuantity(Quantity.create(event.newQuantity))
			}
		} else if (event instanceof CartCleared) {
			this._items.clear()
		}
	}

	// ============ 行為方法（發佈事件） ============

	/**
	 * 加入商品到購物車
	 *
	 * @param productId - 商品 ID
	 * @param quantity - 數量
	 * @param price - 單位價格
	 * @throws Error 如果商品已在購物車中
	 */
	addItem(productId: string, quantity: Quantity, price: number): void {
		if (this._items.has(productId)) {
			throw new Error('商品已在購物車中，請使用 updateItemQuantity()')
		}

		this.raiseEvent(new ItemAdded(this.id, productId, quantity.value, price))
	}

	/**
	 * 移除商品從購物車
	 *
	 * @param productId - 商品 ID
	 * @throws Error 如果商品不存在
	 */
	removeItem(productId: string): void {
		if (!this._items.has(productId)) {
			throw new Error('購物車中不存在此商品')
		}

		this.raiseEvent(new ItemRemoved(this.id, productId))
	}

	/**
	 * 更新商品數量
	 *
	 * @param productId - 商品 ID
	 * @param newQuantity - 新的數量
	 * @throws Error 如果商品不存在
	 */
	updateItemQuantity(productId: string, newQuantity: Quantity): void {
		const item = this._items.get(productId)
		if (!item) {
			throw new Error('購物車中不存在此商品')
		}

		if (item.quantity.equals(newQuantity)) {
			return
		}

		this.raiseEvent(
			new ItemQuantityChanged(this.id, productId, item.quantity.value, newQuantity.value)
		)
	}

	/**
	 * 清空購物車
	 */
	clear(): void {
		if (this._items.size === 0) {
			return
		}

		this.raiseEvent(new CartCleared(this.id))
	}

	/**
	 * 請求結帳
	 *
	 * @throws Error 如果購物車為空
	 */
	requestCheckout(): void {
		if (this._items.size === 0) {
			throw new Error('購物車為空，無法結帳')
		}

		const items = Array.from(this._items.values()).map((item) => ({
			productId: item.productId,
			quantity: item.quantity.value,
			price: item.price,
		}))

		const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0)

		this.raiseEvent(new CartCheckoutRequested(this.id, this._userId, items, totalAmount))
	}

	// ============ Getters （只讀屬性） ============

	get cartId(): CartId {
		return this._cartId
	}

	get userId(): string {
		return this._userId
	}

	get items(): CartItem[] {
		return Array.from(this._items.values())
	}

	get itemCount(): number {
		return this._items.size
	}

	get createdAt(): Date {
		return new Date(this._createdAt.getTime())
	}

	/**
	 * 取得購物車總金額
	 */
	getTotalAmount(): number {
		return Array.from(this._items.values()).reduce((sum, item) => sum + item.getSubtotal(), 0)
	}

	/**
	 * 取得購物車總項目數
	 */
	getTotalQuantity(): number {
		return Array.from(this._items.values()).reduce((sum, item) => sum + item.quantity.value, 0)
	}

	/**
	 * 檢查購物車是否為空
	 */
	isEmpty(): boolean {
		return this._items.size === 0
	}
}
