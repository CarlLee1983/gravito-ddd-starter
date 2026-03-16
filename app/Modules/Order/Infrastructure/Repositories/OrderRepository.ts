/**
 * @file OrderRepository.ts
 * @description 訂單倉儲 (Repository) 基礎設施層實現 (ORM 無關)
 *
 * 使用 IDatabaseAccess port 實現，OrderLine 透過 JSON 欄位存在 orders.lines。
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import { Order } from '../../Domain/Aggregates/Order'
import { OrderLine } from '../../Domain/Aggregates/OrderLine'
import { OrderId } from '../../Domain/ValueObjects/OrderId'
import { OrderStatus } from '../../Domain/ValueObjects/OrderStatus'
import { OrderTotal } from '../../Domain/ValueObjects/OrderTotal'
import { Money } from '../../Domain/ValueObjects/Money'
import type { IOrderRepository } from '../../Domain/Repositories/IOrderRepository'

/**
 * 訂單倉儲基礎設施層實現
 *
 * 負責將 Order 聚合根持久化至資料庫。
 * 使用 IDatabaseAccess 介面，Order 狀態序列化為 orders 表的一行，
 * OrderLine 集合序列化為 JSON 欄位。
 */
export class OrderRepository implements IOrderRepository {
	/**
	 * 初始化訂單倉儲
	 *
	 * @param db - 資料庫存取介面
	 * @param eventDispatcher - 事件分派器
	 */
	constructor(
		private readonly db: IDatabaseAccess,
		private readonly eventDispatcher?: IEventDispatcher
	) {}

	/**
	 * 根據 ID 查找單一訂單
	 *
	 * @param id - 訂單 ID
	 * @returns Promise<Order | null> 找到的訂單聚合根，若無則返回 null
	 */
	async findById(id: OrderId | string): Promise<Order | null> {
		const idStr = typeof id === 'string' ? id : id.toString()
		const row = await this.db.table('orders').where('id', '=', idStr).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 根據使用者 ID 查找訂單列表
	 *
	 * @param userId - 使用者 ID
	 * @returns Promise<Order[]> 訂單聚合根列表
	 */
	async findByUserId(userId: string): Promise<Order[]> {
		const rows = await this.db.table('orders').where('user_id', '=', userId).select()
		return rows.map((row) => this.toDomain(row))
	}

	/**
	 * 保存新建立的訂單
	 *
	 * @param order - 要保存的訂單聚合根
	 * @returns Promise<Order> 保存後的訂單聚合根
	 */
	async save(order: Order): Promise<Order> {
		const row = this.toRow(order)
		await this.db.table('orders').insert(row)

		// 分派領域事件
		if (this.eventDispatcher && 'getUncommittedEvents' in order) {
			const events = (order as any).getUncommittedEvents?.() ?? []
			for (const event of events) {
				await this.eventDispatcher.dispatch(event)
			}
			;(order as any).markEventsAsCommitted?.()
		}

		return order
	}

	/**
	 * 更新現有訂單狀態或資訊
	 *
	 * @param order - 要更新的訂單聚合根
	 * @returns Promise<Order> 更新後的訂單聚合根
	 */
	async update(order: Order): Promise<Order> {
		const row = this.toRow(order)
		await this.db
			.table('orders')
			.where('id', '=', order.orderId.toString())
			.update(row)

		// 分派領域事件
		if (this.eventDispatcher && 'getUncommittedEvents' in order) {
			const events = (order as any).getUncommittedEvents?.() ?? []
			for (const event of events) {
				await this.eventDispatcher.dispatch(event)
			}
			;(order as any).markEventsAsCommitted?.()
		}

		return order
	}

	/**
	 * 刪除訂單
	 *
	 * @param id - 訂單 ID
	 * @returns Promise<void>
	 */
	async delete(id: OrderId | string): Promise<void> {
		const idStr = typeof id === 'string' ? id : id.toString()
		await this.db.table('orders').where('id', '=', idStr).delete()
	}

	/**
	 * 查找系統中所有訂單
	 *
	 * @returns Promise<Order[]> 訂單列表
	 */
	async findAll(): Promise<Order[]> {
		const rows = await this.db.table('orders').select()
		return rows.map((row) => this.toDomain(row))
	}

	/**
	 * 從資料庫原始資料重建 Order 聚合根
	 *
	 * @param row - 資料庫返回的原始行資料
	 * @returns Order 聚合根實例
	 */
	private toDomain(row: any): Order {
		const orderId = OrderId.fromString(row.id)
		const status = OrderStatus.fromString(row.status)
		const subtotal = Money.create(row.subtotal, row.currency)
		const orderTotal = OrderTotal.create(subtotal, row.tax)

		// 從 JSON 欄位解析訂單行
		let lines: OrderLine[] = []
		try {
			const storedLines = row.lines ? (typeof row.lines === 'string' ? JSON.parse(row.lines) : row.lines) : []
			if (Array.isArray(storedLines)) {
				lines = storedLines.map((lineRow: any) =>
					OrderLine.create(
						lineRow.productId,
						lineRow.productName,
						lineRow.quantity,
						Money.create(lineRow.unitPrice, lineRow.currency)
					)
				)
			}
		} catch (error) {
			// 解析失敗，忽略錯誤，使用空陣列
		}

		return new Order(
			orderId,
			row.user_id,
			lines,
			status,
			orderTotal,
			new Date(row.created_at),
			new Date(row.updated_at)
		)
	}

	/**
	 * 將 Order 聚合根轉換為資料庫行資料
	 *
	 * @param order - Order 聚合根
	 * @returns 資料庫行資料物件
	 */
	private toRow(order: Order): Record<string, unknown> {
		// 序列化訂單行為 JSON
		const lines = order.lines.map((line) => ({
			productId: line.productId,
			productName: line.productName,
			quantity: line.quantity,
			unitPrice: line.unitPrice.amount,
			currency: line.unitPrice.currency,
		}))

		return {
			id: order.orderId.toString(),
			user_id: order.userId,
			status: order.status.toString(),
			lines: JSON.stringify(lines),
			subtotal: order.total.subtotal.amount,
			tax: order.total.tax.amount,
			total: order.total.total.amount,
			currency: order.total.subtotal.currency,
			created_at: order.createdAt.toISOString(),
			updated_at: order.updatedAt.toISOString(),
		}
	}
}
