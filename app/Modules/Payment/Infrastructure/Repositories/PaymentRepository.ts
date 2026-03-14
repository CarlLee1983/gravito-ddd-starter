import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'
import { Payment } from '../../Domain/Aggregates/Payment'
import type { PaymentId } from '../../Domain/ValueObjects/PaymentId'

export class PaymentRepository implements IPaymentRepository {
	constructor(
		private db: IDatabaseAccess,
		private eventDispatcher: IEventDispatcher
	) {}

	async findAll(params?: { limit?: number; offset?: number }): Promise<Payment[]> {
		let query = this.db.table('payments')
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)
		const rows = await query.select()
		return rows.map(row => this.toDomain(row))
	}

	async findById(id: PaymentId): Promise<Payment | null> {
		const row = await this.db.table('payments').where('id', '=', id.value).first()
		return row ? this.toDomain(row) : null
	}

	async findByOrderId(orderId: string): Promise<Payment | null> {
		const row = await this.db.table('payments').where('order_id', '=', orderId).first()
		return row ? this.toDomain(row) : null
	}

	async findByTransactionId(transactionId: string): Promise<Payment | null> {
		const row = await this.db.table('payments').where('transaction_id', '=', transactionId).first()
		return row ? this.toDomain(row) : null
	}

	async save(payment: Payment): Promise<void> {
		const row = this.toRow(payment)
		const exists = await this.findById(payment.id)

		if (exists) {
			await this.db.table('payments').where('id', '=', payment.id.value).update(row)
		} else {
			await this.db.table('payments').insert(row)
		}

		// 分派領域事件
		const events = payment.getDomainEvents()
		for (const event of events) {
			await this.eventDispatcher.dispatch(event)
		}
	}

	async delete(id: PaymentId): Promise<void> {
		await this.db.table('payments').where('id', '=', id.value).delete()
	}

	async count(): Promise<number> {
		return this.db.table('payments').count()
	}

	private toDomain(row: any): Payment {
		return Payment.fromDatabase(row)
	}

	private toRow(payment: Payment): any {
		return {
			id: payment.id.value,
			order_id: payment.orderId,
			user_id: payment.userId,
			amount_cents: payment.amount.cents,
			payment_method: payment.paymentMethod.type,
			status: payment.status.value,
			transaction_id: payment.transactionId?.value || null,
			failure_reason: payment.failureReason || null,
			created_at: payment.createdAt.toISOString(),
			updated_at: payment.updatedAt.toISOString(),
		}
	}
}
