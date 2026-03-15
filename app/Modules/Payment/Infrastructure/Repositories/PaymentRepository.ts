/**
 * @file PaymentRepository.ts
 * @description 支付模組 Repository 實作，負責支付數據的持久化
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'
import { Payment } from '../../Domain/Aggregates/Payment'
import type { PaymentId } from '../../Domain/ValueObjects/PaymentId'

/**
 * 支付 Repository 實作類
 */
export class PaymentRepository implements IPaymentRepository {
	constructor(
		private db: IDatabaseAccess,
		private eventDispatcher: IEventDispatcher
	) {}

	/**
	 * 查詢所有支付記錄
	 *
	 * @param params - 查詢參數（限制數量與偏移量）
	 * @returns 支付領域對象數組
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<Payment[]> {
		let query = this.db.table('payments')
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)
		const rows = await query.select()
		return rows.map(row => this.toDomain(row))
	}

	/**
	 * 根據 ID 查詢支付記錄
	 *
	 * @param id - 支付 ID 值物件
	 * @returns 支付領域對象或 null
	 */
	async findById(id: PaymentId): Promise<Payment | null> {
		const row = await this.db.table('payments').where('id', '=', id.value).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 根據訂單 ID 查詢支付記錄
	 *
	 * @param orderId - 訂單 ID
	 * @returns 支付領域對象或 null
	 */
	async findByOrderId(orderId: string): Promise<Payment | null> {
		const row = await this.db.table('payments').where('order_id', '=', orderId).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 根據交易流水號查詢支付記錄
	 *
	 * @param transactionId - 外部交易流水號
	 * @returns 支付領域對象或 null
	 */
	async findByTransactionId(transactionId: string): Promise<Payment | null> {
		const row = await this.db.table('payments').where('transaction_id', '=', transactionId).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 儲存或更新支付記錄，並分派領域事件
	 *
	 * @param payment - 支付領域對象
	 * @returns 非同步任務
	 */
	async save(payment: Payment): Promise<void> {
		const row = this.toRow(payment)
		const exists = await this.findById(payment.id)

		if (exists) {
			await this.db.table('payments').where('id', '=', payment.id.value).update(row)
		} else {
			await this.db.table('payments').insert(row)
		}

		// 分派領域事件（使用 AggregateRoot API）
		const events = payment.getUncommittedEvents()
		for (const event of events) {
			await this.eventDispatcher.dispatch(event)
		}
		payment.markEventsAsCommitted()
	}

	/**
	 * 刪除支付記錄
	 *
	 * @param id - 支付 ID 值物件
	 * @returns 非同步任務
	 */
	async delete(id: PaymentId): Promise<void> {
		await this.db.table('payments').where('id', '=', id.value).delete()
	}

	/**
	 * 獲取支付記錄總數
	 *
	 * @returns 支付總數
	 */
	async count(): Promise<number> {
		return this.db.table('payments').count()
	}

	/**
	 * 將資料庫行數據轉換為領域對象
	 *
	 * @param row - 資料庫行數據
	 * @returns 支付領域對象
	 */
	private toDomain(row: any): Payment {
		return Payment.fromDatabase(row)
	}

	/**
	 * 將領域對象轉換為資料庫行數據
	 *
	 * @param payment - 支付領域對象
	 * @returns 資料庫行數據物件
	 */
	private toRow(payment: Payment): any {
		return {
			id: payment.id.value,
			order_id: payment.orderId,
			user_id: payment.userId,
			amount_cents: payment.amount.cents,
			payment_method: payment.paymentMethod.type,
			status: payment.status.value,
			transaction_id: payment.transactionId?.value || null,
			failure_reason: payment.failure_reason || null,
			created_at: payment.createdAt.toISOString(),
			updated_at: payment.updatedAt.toISOString(),
		}
	}
}
