import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'

/**
 * 處理支付失敗應用服務
 */
export class HandlePaymentFailureService {
	constructor(private paymentRepository: IPaymentRepository) {}

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
