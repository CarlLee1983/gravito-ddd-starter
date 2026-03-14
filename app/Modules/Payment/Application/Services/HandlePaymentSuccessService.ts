/**
 * @file HandlePaymentSuccessService.ts
 * @description 處理支付成功應用服務
 */

import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'
import { TransactionId } from '../../Domain/ValueObjects/TransactionId'

/**
 * 處理支付成功應用服務
 */
export class HandlePaymentSuccessService {
	constructor(private paymentRepository: IPaymentRepository) {}

	/**
	 * 執行支付成功處理邏輯
	 *
	 * @param paymentId - 支付記錄 ID
	 * @param transactionId - 外部交易流水號
	 * @returns 非同步任務
	 * @throws Error 當支付記錄不存在或狀態無效時
	 */
	async execute(paymentId: string, transactionId: string): Promise<void> {
		// 從資料庫取得支付
		const payment = await this.paymentRepository.findById(
			{ value: paymentId } as any
		)

		if (!payment) {
			throw new Error(`支付記錄不存在: ${paymentId}`)
		}

		if (!payment.isPending()) {
			throw new Error(`支付狀態無效，無法標記為成功: ${payment.status.toString()}`)
		}

		// 標記為成功
		const txId = TransactionId.from(transactionId)
		payment.succeed(txId)

		// 儲存變更
		await this.paymentRepository.save(payment)
	}
}
