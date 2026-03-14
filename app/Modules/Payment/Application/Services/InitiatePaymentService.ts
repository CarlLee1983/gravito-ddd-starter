/**
 * @file InitiatePaymentService.ts
 * @description 發起支付應用服務
 */

import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'
import { Payment } from '../../Domain/Aggregates/Payment'
import { Amount } from '../../Domain/ValueObjects/Amount'
import { PaymentMethod } from '../../Domain/ValueObjects/PaymentMethod'
import type { InitiatePaymentDTO } from '../DTOs/InitiatePaymentDTO'
import type { PaymentResponseDTO } from '../DTOs/PaymentResponseDTO'

/**
 * 發起支付應用服務
 */
export class InitiatePaymentService {
	constructor(private paymentRepository: IPaymentRepository) {}

	/**
	 * 執行發起支付邏輯
	 *
	 * @param dto - 發起支付 DTO
	 * @returns 支付回應 DTO
	 * @throws Error 當輸入參數無效時
	 */
	async execute(dto: InitiatePaymentDTO): Promise<PaymentResponseDTO> {
		// 驗證輸入
		if (!dto.orderId || !dto.userId || dto.amountCents <= 0) {
			throw new Error('無效的支付請求')
		}

		// 建立支付
		const amount = new Amount(dto.amountCents)
		const paymentMethod = PaymentMethod.from(dto.paymentMethod)

		const payment = Payment.create(
			dto.orderId,
			dto.userId,
			amount,
			paymentMethod
		)

		// 儲存到資料庫
		await this.paymentRepository.save(payment)

		// 返回 DTO
		return this.toDTO(payment)
	}

	/**
	 * 將 Payment 領域對象轉換為 DTO
	 *
	 * @param payment - 支付領域對象
	 * @returns 支付回應 DTO
	 */
	private toDTO(payment: Payment): PaymentResponseDTO {
		return {
			id: payment.id.value,
			orderId: payment.orderId,
			userId: payment.userId,
			amountCents: payment.amount.cents,
			amountTWD: payment.amount.dollars,
			paymentMethod: payment.paymentMethod.type,
			status: payment.status.value,
			transactionId: payment.transactionId?.value,
			failureReason: payment.failureReason,
			createdAt: payment.createdAt.toISOString(),
			updatedAt: payment.updatedAt.toISOString(),
		}
	}
}
