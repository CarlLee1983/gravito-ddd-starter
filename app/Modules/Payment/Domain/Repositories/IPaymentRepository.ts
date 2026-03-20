/**
 * @file IPaymentRepository.ts
 * @description 支付 Repository 介面定義
 */

import { Payment } from '../Aggregates/Payment'
import type { PaymentId } from '../ValueObjects/PaymentId'

/**
 * 支付 Repository 介面
 */
export interface IPaymentRepository {
	/** 查詢所有支付記錄 */
	findAll(params?: { limit?: number; offset?: number }): Promise<Payment[]>
	/** 根據 ID 查詢 */
	findById(id: PaymentId): Promise<Payment | null>
	/** 根據訂單 ID 查詢所有支付記錄 */
	findByOrderId(orderId: string): Promise<Payment[]>
	/** 根據交易流水號查詢 */
	findByTransactionId(transactionId: string): Promise<Payment | null>
	/** 儲存或更新支付 */
	save(payment: Payment): Promise<void>
	/** 刪除支付記錄 */
	delete(id: PaymentId): Promise<void>
	/** 獲取記錄總數 */
	count(): Promise<number>
}
