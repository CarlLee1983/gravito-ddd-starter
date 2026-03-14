/**
 * @file HandlePaymentFailureService.ts
 * @description 處理支付失敗應用服務
 */

import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'

/**
 * 處理支付失敗應用服務
 */
export class HandlePaymentFailureService {
	constructor(private paymentRepository: IPaymentRepository) {}

	/**
	 * 執行支付失敗處理邏輯
	 *
	 * @param paymentId - 支付記錄 ID
	 * @param reason - 失敗原因
	 * @returns 非同步任務
	 * @throws Error 當支付記錄不存在或狀態無效時
	 */
	async execute(paymentId: string, reason: string): Promise<void> {
		// 從資料庫取得支付
		const payment = await this.paymentRepository.findById(
			{ value: paymentId } as any
		)

		if (!payment) {
			throw new Error(`支付記錄不存在: ${paymentId}`)
		}

		if (!payment.isPending()) {
			throw new Error(`支付狀態無效，無法標記為失敗: ${payment.status.toString()}`)
		}

		// 標記為失敗
		payment.fail(reason)

		// 儲存變更
		await this.paymentRepository.save(payment)
	}
}
