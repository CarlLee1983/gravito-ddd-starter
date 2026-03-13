import { Payment } from '../Aggregates/Payment'
import type { PaymentId } from '../ValueObjects/PaymentId'

export interface IPaymentRepository {
	findAll(params?: { limit?: number; offset?: number }): Promise<Payment[]>
	findById(id: PaymentId): Promise<Payment | null>
	findByOrderId(orderId: string): Promise<Payment | null>
	findByTransactionId(transactionId: string): Promise<Payment | null>
	save(payment: Payment): Promise<void>
	delete(id: PaymentId): Promise<void>
	count(): Promise<number>
}
