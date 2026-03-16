/**
 * @file CartRepository.ts
 * @description 購物車倉儲實現 (ORM 無關)
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：實作領域層定義的 Repository 介面
 * - 職責：處理 Cart 實體與底層持久化存儲之間的轉換與操作
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import type { IEventStore } from '@/Foundation/Infrastructure/Ports/Database/IEventStore'
import { BaseEventSourcedRepository } from '@/Foundation/Infrastructure/Database/Repositories/BaseEventSourcedRepository'
import { toIntegrationEvent, type IntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { Cart } from '../../Domain/Aggregates/Cart'
import { CartCheckoutRequested } from '../../Domain/Events/CartCheckoutRequested'
import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'

/**
 * 購物車倉儲類別
 *
 * 繼承 BaseEventSourcedRepository，享受統一的：
 * - 樂觀鎖版本控制邏輯
 * - 領域/整合事件分派
 * - EventStore 持久化
 */
export class CartRepository extends BaseEventSourcedRepository<Cart> implements ICartRepository {
	/**
	 * 建構子
	 *
	 * @param db - 資料庫存取介面實例
	 * @param eventDispatcher - 領域事件分發器實例
	 * @param eventStore - 事件存儲實例（選擇性）
	 */
	constructor(
		db: IDatabaseAccess,
		eventDispatcher?: IEventDispatcher,
		eventStore?: IEventStore
	) {
		super(db, eventDispatcher, eventStore)
	}

	/**
	 * 根據使用者 ID 查找購物車
	 *
	 * @param userId - 使用者 ID
	 * @returns Promise 購物車或 null（若不存在）
	 */
	async findByUserId(userId: string): Promise<Cart | null> {
		const cartId = `${userId}_cart`
		return this.findById(cartId)
	}

	protected getTableName(): string {
		return 'carts'
	}

	protected getAggregateTypeName(): string {
		return 'Cart'
	}

	protected toDomain(row: any): Cart {
		const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string)

		// 從 JSON 欄位解析購物車項目
		const items: Array<{ productId: string; quantity: number; price: number; createdAt: Date }> = []
		try {
			const storedItems = row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : []
			if (Array.isArray(storedItems)) {
				items.push(
					...storedItems.map((item: any) => ({
						productId: item.productId,
						quantity: item.quantity,
						price: item.price,
						createdAt: new Date(item.createdAt),
					}))
				)
			}
		} catch (error) {
			console.error('[CartRepository] Error parsing items:', error)
		}

		return Cart.reconstitute(
			row.id as string,
			row.user_id as string,
			createdAt,
			items
		)
	}

	protected toRow(cart: Cart): Record<string, unknown> {
		// 序列化購物車項目為 JSON
		const items = cart.items.map((item) => ({
			productId: item.productId,
			quantity: item.quantity.value,
			price: item.price,
			createdAt: item.createdAt.toISOString(),
		}))

		return {
			id: cart.id,
			user_id: cart.userId,
			created_at: cart.createdAt.toISOString(),
			updated_at: new Date().toISOString(),
			items: JSON.stringify(items),
		}
	}

	protected toIntegrationEvent(event: DomainEvent): IntegrationEvent | null {
		if (event instanceof CartCheckoutRequested) {
			return toIntegrationEvent(
				'CartCheckoutRequested',
				'Cart',
				{
					cartId: event.cartId,
					userId: event.userId,
					items: JSON.stringify(event.items),
					totalAmount: event.totalAmount,
				},
				event.userId
			)
		}

		// 其他事件暫不發佈至其他 Bounded Context
		return null
	}
}
